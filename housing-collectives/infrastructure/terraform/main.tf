# Hetzner Cloud Infrastructure for Housing Collectives
# This is a starting point - customize as needed

terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

# Variables
variable "hcloud_token" {
  description = "Hetzner Cloud API Token"
  type        = string
  sensitive   = true
}

variable "domain" {
  description = "Domain name for the application"
  type        = string
}

variable "server_type" {
  description = "Hetzner server type"
  type        = string
  default     = "cpx21"  # 4 vCPU, 8 GB RAM
}

variable "location" {
  description = "Hetzner server location"
  type        = string
  default     = "nbg1"  # Nuremberg
}

variable "ssh_public_key" {
  description = "SSH public key for server access"
  type        = string
}

# SSH Key
resource "hcloud_ssh_key" "deployer" {
  name       = "deployer"
  public_key = var.ssh_public_key
}

# Firewall
resource "hcloud_firewall" "web" {
  name = "web-firewall"

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
}

# Server
resource "hcloud_server" "web" {
  name        = "housing-collectives"
  server_type = var.server_type
  image       = "ubuntu-22.04"
  location    = var.location
  ssh_keys    = [hcloud_ssh_key.deployer.id]
  firewall_ids = [hcloud_firewall.web.id]

  labels = {
    environment = "production"
    project     = "housing-collectives"
  }

  user_data = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
    
    # Install Docker
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Add user to docker group
    usermod -aG docker root
    
    # Create application directory
    mkdir -p /opt/housing-collectives
    
    # Install fail2ban for security
    apt-get install -y fail2ban
    
    # Basic fail2ban config
    cat > /etc/fail2ban/jail.local << 'FAIL2BAN'
    [DEFAULT]
    bantime = 3600
    findtime = 600
    maxretry = 3
    
    [sshd]
    enabled = true
    FAIL2BAN
    
    systemctl enable fail2ban
    systemctl start fail2ban
    
    # Automatic security updates
    apt-get install -y unattended-upgrades
    dpkg-reconfigure -plow unattended-upgrades
  EOF
}

# Volume for persistent data
resource "hcloud_volume" "data" {
  name      = "housing-collectives-data"
  size      = 50
  server_id = hcloud_server.web.id
  format    = "ext4"
}

# Outputs
output "server_ip" {
  value = hcloud_server.web.ipv4_address
}

output "server_id" {
  value = hcloud_server.web.id
}

output "volume_id" {
  value = hcloud_volume.data.id
}
