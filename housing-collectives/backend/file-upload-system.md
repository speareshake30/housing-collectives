# File Upload System Design
## European Housing Collectives Community

**Version:** 1.0  
**Storage:** Local (development) / S3-compatible (production)

---

## Overview

Multi-tier file upload system supporting:
- User avatars
- Collective cover images & galleries
- Room ad images
- Message attachments
- Event cover images

**Max file size:** 10MB  
**Supported formats:** JPEG, PNG, WebP, GIF (images), PDF (documents)

---

## Architecture

```
┌──────────┐     ┌──────────────┐     ┌─────────────────┐
│  Client  │────▶│  API Server  │────▶│  File Storage   │
│          │     │              │     │  (Local/S3)     │
└──────────┘     └──────────────┘     └─────────────────┘
                        │
                        ▼
                 ┌──────────────┐
                 │  PostgreSQL  │
                 │  (metadata)  │
                 └──────────────┘
```

---

## Upload Flow

### 1. Direct Upload (Recommended)

Client uploads directly to storage with presigned URL:

```
Client         API Server       S3/Storage       Database
  │                │                │                │
  │ POST /upload   │                │                │
  │ (metadata)     │                │                │
  │───────────────▶│                │                │
  │                │ 1. Generate    │                │
  │                │    presigned   │                │
  │                │    URL         │                │
  │                │◀───────────────│                │
  │                │                │                │
  │                │ 2. Create file │                │
  │                │    record      │                │
  │                │───────────────▶│───────────────▶│
  │                │                │                │
  │ 201 Created    │                │                │
  │ {upload_url,   │                │                │
  │  file_id}      │                │                │
  │◀───────────────│                │                │
  │                │                │                │
  │ PUT upload_url │                │                │
  │ (binary data)  │                │                │
  │───────────────────────────────▶│                │
  │                │                │                │
  │ 200 OK         │                │                │
  │◀───────────────────────────────│                │
  │                │                │                │
  │ PATCH /files/  │                │                │
  │ {file_id}      │                │                │
  │ {status:done}  │                │                │
  │───────────────▶│                │                │
  │                │ 3. Verify &    │                │
  │                │    update      │                │
  │                │───────────────▶│───────────────▶│
  │                │                │                │
  │ 200 OK         │                │                │
  │ {file_url}     │                │                │
  │◀───────────────│                │                │
```

### 2. Proxied Upload (Simpler)

Client uploads to API, API uploads to storage:

```
Client ──▶ API Server ──▶ S3/Storage
                │
                ▼
           Database
```

---

## API Endpoints

### POST /files/upload-request
Request a presigned upload URL.

**Request:**
```json
{
  "filename": "profile-photo.jpg",
  "mime_type": "image/jpeg",
  "file_size": 2456789,
  "entity_type": "user_avatar",  // 'user_avatar', 'collective_cover', etc.
  "entity_id": "uuid"  // Optional
}
```

**Response (201):**
```json
{
  "file_id": "uuid",
  "upload_url": "https://s3.eu-central-1.amazonaws.com/bucket/uuid.jpg?X-Amz-...",
  "upload_method": "PUT",
  "upload_headers": {
    "Content-Type": "image/jpeg",
    "x-amz-acl": "public-read"
  },
  "expires_at": "2024-02-20T19:00:00Z"
}
```

### PUT {upload_url}
Upload file binary data to presigned URL.

**Request:**
- Binary file data
- Headers from upload-request response

**Response (200):** From S3/storage provider

### PATCH /files/:id/complete
Confirm upload completion.

**Request:**
```json
{
  "status": "completed"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "url": "https://cdn.housingcollectives.eu/files/uuid.jpg",
  "thumbnail_url": "https://cdn.housingcollectives.eu/files/uuid_thumb.jpg",
  "mime_type": "image/jpeg",
  "file_size": 2456789,
  "width": 1920,
  "height": 1080
}
```

### POST /files (Proxied Upload)
Direct upload through API (for smaller files).

**Content-Type:** `multipart/form-data`

**Request:**
- `file`: File data
- `entity_type`: Usage type
- `entity_id`: Related entity ID

**Response (201):** Same as complete

---

## Storage Configuration

### Development (Local Filesystem)

```javascript
// config/storage.js
module.exports = {
  provider: 'local',
  local: {
    root: './uploads',
    baseUrl: 'http://localhost:3000/uploads'
  },
  
  // Image processing
  images: {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 85,
    formats: ['jpeg', 'png', 'webp']
  },
  
  // Thumbnails
  thumbnails: {
    sizes: [
      { name: 'small', width: 150, height: 150, crop: true },
      { name: 'medium', width: 400, height: 300 },
      { name: 'large', width: 800, height: 600 }
    ]
  }
};
```

### Production (S3-Compatible)

```javascript
module.exports = {
  provider: 's3',
  s3: {
    endpoint: process.env.S3_ENDPOINT,  // e.g., 'https://s3.eu-central-1.amazonaws.com'
    region: process.env.S3_REGION,
    bucket: process.env.S3_BUCKET,
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
    
    // For CDN
    cdnUrl: process.env.CDN_URL,  // e.g., 'https://cdn.housingcollectives.eu'
    
    // ACL for uploaded files
    acl: 'public-read'
  }
};
```

### Alternative: Cloudflare R2

```javascript
module.exports = {
  provider: 's3',  // R2 is S3-compatible
  s3: {
    endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    region: 'auto',
    bucket: process.env.R2_BUCKET,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    cdnUrl: process.env.R2_PUBLIC_URL
  }
};
```

---

## Image Processing

### Sharp-based Pipeline

```javascript
const sharp = require('sharp');
const path = require('path');

class ImageProcessor {
  async process(buffer, options = {}) {
    const {
      maxWidth = 2048,
      maxHeight = 2048,
      quality = 85,
      format = 'jpeg'
    } = options;

    let pipeline = sharp(buffer);

    // Get metadata
    const metadata = await pipeline.metadata();

    // Resize if needed
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      pipeline = pipeline.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Convert and compress
    switch (format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({ quality, progressive: true });
        break;
      case 'png':
        pipeline = pipeline.png({ compressionLevel: 9 });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality });
        break;
    }

    const processed = await pipeline.toBuffer();
    const newMetadata = await sharp(processed).metadata();

    return {
      buffer: processed,
      width: newMetadata.width,
      height: newMetadata.height,
      format: newMetadata.format,
      size: processed.length
    };
  }

  async createThumbnail(buffer, width, height, crop = false) {
    let pipeline = sharp(buffer);

    if (crop) {
      pipeline = pipeline.resize(width, height, { fit: 'cover' });
    } else {
      pipeline = pipeline.resize(width, height, { fit: 'inside' });
    }

    return pipeline.jpeg({ quality: 80 }).toBuffer();
  }

  async generateThumbnails(buffer, sizes) {
    const thumbnails = {};

    for (const size of sizes) {
      const thumbnail = await this.createThumbnail(
        buffer,
        size.width,
        size.height,
        size.crop
      );
      thumbnails[size.name] = thumbnail;
    }

    return thumbnails;
  }
}

module.exports = ImageProcessor;
```

---

## File Validation

```javascript
const FILE_TYPES = {
  'image/jpeg': { ext: '.jpg', maxSize: 10 * 1024 * 1024 },
  'image/png': { ext: '.png', maxSize: 10 * 1024 * 1024 },
  'image/webp': { ext: '.webp', maxSize: 10 * 1024 * 1024 },
  'image/gif': { ext: '.gif', maxSize: 5 * 1024 * 1024 },
  'application/pdf': { ext: '.pdf', maxSize: 10 * 1024 * 1024 }
};

const ENTITY_CONFIG = {
  user_avatar: {
    types: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 5 * 1024 * 1024,
    dimensions: { min: 200, max: 2000 },
    aspectRatio: 'square' // 1:1
  },
  collective_cover: {
    types: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 10 * 1024 * 1024,
    dimensions: { min: 800, max: 4000 },
    aspectRatio: 'landscape' // 16:9 or 3:2
  },
  room_ad_image: {
    types: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 10 * 1024 * 1024,
    maxCount: 10 // per ad
  },
  message_attachment: {
    types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'],
    maxSize: 10 * 1024 * 1024,
    maxCount: 5 // per message
  }
};

function validateFile(file, entityType) {
  const config = ENTITY_CONFIG[entityType];
  if (!config) {
    return { valid: false, error: 'Invalid entity type' };
  }

  // Check file type
  if (!config.types.includes(file.mimetype)) {
    return { 
      valid: false, 
      error: `Invalid file type. Allowed: ${config.types.join(', ')}` 
    };
  }

  // Check file size
  if (file.size > config.maxSize) {
    return { 
      valid: false, 
      error: `File too large. Max: ${config.maxSize / 1024 / 1024}MB` 
    };
  }

  return { valid: true };
}

module.exports = { validateFile, FILE_TYPES, ENTITY_CONFIG };
```

---

## Upload Handler (Express)

```javascript
const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const ImageProcessor = require('./services/ImageProcessor');
const StorageService = require('./services/StorageService');
const { validateFile } = require('./utils/fileValidation');

const router = express.Router();

// Memory storage for processing
const upload = multer({ storage: multer.memoryStorage() });

// Request presigned URL
router.post('/upload-request', authenticateToken, async (req, res) => {
  try {
    const { filename, mime_type, file_size, entity_type, entity_id } = req.body;

    // Validate
    const validation = validateFile(
      { mimetype: mime_type, size: file_size },
      entity_type
    );
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Create file record
    const fileId = uuidv4();
    const ext = path.extname(filename);
    const storedFilename = `${fileId}${ext}`;

    await db.query(
      `INSERT INTO file_uploads 
       (id, original_filename, stored_filename, mime_type, file_size, 
        uploaded_by, entity_type, entity_id, storage_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [fileId, filename, storedFilename, mime_type, file_size,
       req.user.id, entity_type, entity_id, storedFilename]
    );

    // Generate presigned URL
    const { url, method, headers, expiresIn } = await StorageService.getPresignedUploadUrl(
      storedFilename,
      mime_type
    );

    res.status(201).json({
      file_id: fileId,
      upload_url: url,
      upload_method: method,
      upload_headers: headers,
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString()
    });

  } catch (err) {
    console.error('Upload request error:', err);
    res.status(500).json({ error: 'Failed to create upload request' });
  }
});

// Complete upload
router.patch('/files/:id/complete', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Get file record
    const fileResult = await db.query(
      'SELECT * FROM file_uploads WHERE id = $1 AND uploaded_by = $2',
      [id, req.user.id]
    );

    if (!fileResult.rows[0]) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = fileResult.rows[0];

    if (status === 'completed') {
      // Verify file exists in storage
      const exists = await StorageService.exists(file.storage_path);
      if (!exists) {
        return res.status(400).json({ error: 'File not found in storage' });
      }

      // Process images
      let metadata = {};
      if (file.mime_type.startsWith('image/')) {
        const buffer = await StorageService.download(file.storage_path);
        const processor = new ImageProcessor();
        
        // Process main image
        const processed = await processor.process(buffer);
        await StorageService.upload(file.storage_path, processed.buffer);

        // Generate thumbnails
        const thumbnails = await processor.generateThumbnails(
          processed.buffer,
          [
            { name: 'thumb', width: 150, height: 150, crop: true },
            { name: 'medium', width: 400, height: 300 },
            { name: 'large', width: 800, height: 600 }
          ]
        );

        // Upload thumbnails
        for (const [name, thumbBuffer] of Object.entries(thumbnails)) {
          const thumbPath = file.storage_path.replace(
            path.extname(file.storage_path),
            `_${name}${path.extname(file.storage_path)}`
          );
          await StorageService.upload(thumbPath, thumbBuffer);
        }

        metadata = {
          width: processed.width,
          height: processed.height
        };
      }

      // Update file record
      await db.query(
        `UPDATE file_uploads 
         SET is_public = true, width = $1, height = $2
         WHERE id = $3`,
        [metadata.width, metadata.height, id]
      );

      // Get public URL
      const urls = StorageService.getPublicUrls(file.storage_path);

      res.json({
        id,
        url: urls.original,
        thumbnail_url: urls.thumb,
        medium_url: urls.medium,
        large_url: urls.large,
        mime_type: file.mime_type,
        file_size: file.file_size,
        width: metadata.width,
        height: metadata.height
      });

    } else if (status === 'cancelled') {
      // Delete file record
      await db.query('DELETE FROM file_uploads WHERE id = $1', [id]);
      res.json({ message: 'Upload cancelled' });
    }

  } catch (err) {
    console.error('Complete upload error:', err);
    res.status(500).json({ error: 'Failed to complete upload' });
  }
});

// Proxied upload (for simple use cases)
router.post('/files', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { entity_type, entity_id } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Validate
    const validation = validateFile(
      { mimetype: file.mimetype, size: file.size },
      entity_type
    );
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Process image
    let processedBuffer = file.buffer;
    let metadata = {};

    if (file.mimetype.startsWith('image/')) {
      const processor = new ImageProcessor();
      const processed = await processor.process(file.buffer);
      processedBuffer = processed.buffer;
      metadata = {
        width: processed.width,
        height: processed.height
      };
    }

    // Upload to storage
    const fileId = uuidv4();
    const ext = path.extname(file.originalname);
    const storedFilename = `${fileId}${ext}`;

    await StorageService.upload(storedFilename, processedBuffer);

    // Save to database
    await db.query(
      `INSERT INTO file_uploads 
       (id, original_filename, stored_filename, mime_type, file_size,
        storage_path, uploaded_by, entity_type, entity_id, 
        is_public, width, height)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, $11)`,
      [fileId, file.originalname, storedFilename, file.mimetype, processedBuffer.length,
       storedFilename, req.user.id, entity_type, entity_id,
       metadata.width, metadata.height]
    );

    // Generate thumbnails for images
    if (file.mimetype.startsWith('image/')) {
      const processor = new ImageProcessor();
      const thumbnails = await processor.generateThumbnails(
        processedBuffer,
        [
          { name: 'thumb', width: 150, height: 150, crop: true },
          { name: 'medium', width: 400, height: 300 }
        ]
      );

      for (const [name, thumbBuffer] of Object.entries(thumbnails)) {
        const thumbPath = storedFilename.replace(ext, `_${name}${ext}`);
        await StorageService.upload(thumbPath, thumbBuffer);
      }
    }

    const urls = StorageService.getPublicUrls(storedFilename);

    res.status(201).json({
      id: fileId,
      url: urls.original,
      thumbnail_url: urls.thumb,
      medium_url: urls.medium,
      mime_type: file.mimetype,
      file_size: processedBuffer.length,
      ...metadata
    });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

module.exports = router;
```

---

## Storage Service Interface

```javascript
const AWS = require('aws-sdk');
const fs = require('fs').promises;
const path = require('path');

class StorageService {
  constructor() {
    this.provider = process.env.STORAGE_PROVIDER || 'local';
    
    if (this.provider === 's3') {
      this.s3 = new AWS.S3({
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION,
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
        s3ForcePathStyle: true
      });
      this.bucket = process.env.S3_BUCKET;
      this.cdnUrl = process.env.CDN_URL;
    } else {
      this.localRoot = process.env.LOCAL_STORAGE_ROOT || './uploads';
    }
  }

  async upload(key, buffer) {
    if (this.provider === 's3') {
      await this.s3.putObject({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ACL: 'public-read'
      }).promise();
    } else {
      const filePath = path.join(this.localRoot, key);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, buffer);
    }
  }

  async download(key) {
    if (this.provider === 's3') {
      const result = await this.s3.getObject({
        Bucket: this.bucket,
        Key: key
      }).promise();
      return result.Body;
    } else {
      return fs.readFile(path.join(this.localRoot, key));
    }
  }

  async exists(key) {
    try {
      if (this.provider === 's3') {
        await this.s3.headObject({
          Bucket: this.bucket,
          Key: key
        }).promise();
      } else {
        await fs.access(path.join(this.localRoot, key));
      }
      return true;
    } catch {
      return false;
    }
  }

  async delete(key) {
    if (this.provider === 's3') {
      await this.s3.deleteObject({
        Bucket: this.bucket,
        Key: key
      }).promise();
    } else {
      await fs.unlink(path.join(this.localRoot, key));
    }
  }

  async getPresignedUploadUrl(key, contentType, expiresIn = 300) {
    if (this.provider === 's3') {
      const url = await this.s3.getSignedUrlPromise('putObject', {
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
        ACL: 'public-read',
        Expires: expiresIn
      });

      return {
        url,
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'x-amz-acl': 'public-read'
        },
        expiresIn
      };
    } else {
      // Local doesn't support presigned URLs, return direct upload endpoint
      return {
        url: `/api/v1/files/direct-upload/${key}`,
        method: 'PUT',
        headers: {
          'Content-Type': contentType
        },
        expiresIn
      };
    }
  }

  getPublicUrls(key) {
    const ext = path.extname(key);
    const base = key.replace(ext, '');

    if (this.provider === 's3') {
      return {
        original: `${this.cdnUrl}/${key}`,
        thumb: `${this.cdnUrl}/${base}_thumb${ext}`,
        medium: `${this.cdnUrl}/${base}_medium${ext}`,
        large: `${this.cdnUrl}/${base}_large${ext}`
      };
    } else {
      const baseUrl = process.env.API_URL || 'http://localhost:3000';
      return {
        original: `${baseUrl}/uploads/${key}`,
        thumb: `${baseUrl}/uploads/${base}_thumb${ext}`,
        medium: `${baseUrl}/uploads/${base}_medium${ext}`,
        large: `${baseUrl}/uploads/${base}_large${ext}`
      };
    }
  }
}

module.exports = new StorageService();
```

---

## Security Considerations

1. **File Type Validation**: Check magic bytes, not just extension
2. **Size Limits**: Enforce at multiple layers
3. **Malware Scanning**: ClamAV integration for production
4. **Rate Limiting**: Per-user upload limits
5. **Storage Quotas**: Per-user storage limits
6. **CORS**: Strict origin policy for direct uploads

```javascript
// Magic bytes validation
function validateMagicBytes(buffer, mimeType) {
  const signatures = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/webp': [0x52, 0x49, 0x46, 0x46],
    'image/gif': [0x47, 0x49, 0x46, 0x38]
  };

  const signature = signatures[mimeType];
  if (!signature) return true; // Unknown type, rely on other checks

  return signature.every((byte, i) => buffer[i] === byte);
}
```

---

## Cleanup & Maintenance

```javascript
// Delete orphaned uploads older than 24 hours
async function cleanupOrphanedUploads() {
  const result = await db.query(
    `SELECT * FROM file_uploads 
     WHERE created_at < NOW() - INTERVAL '24 hours'
     AND NOT EXISTS (
       SELECT 1 FROM users WHERE avatar_url LIKE '%' || file_uploads.id || '%'
       UNION
       SELECT 1 FROM collectives WHERE cover_image_url LIKE '%' || file_uploads.id || '%'
       -- Add more entity checks
     )`
  );

  for (const file of result.rows) {
    await StorageService.delete(file.storage_path);
    await db.query('DELETE FROM file_uploads WHERE id = $1', [file.id]);
  }
}

// Run daily
cron.schedule('0 0 * * *', cleanupOrphanedUploads);
```
