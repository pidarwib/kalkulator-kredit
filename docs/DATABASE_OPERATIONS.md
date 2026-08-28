# DATABASE OPERATIONS & DISASTER RECOVERY MANUAL
## Credit Calculator BPR System

---

## 1. Overview & Architecture

The Credit Calculator BPR system utilizes PostgreSQL (hosted on Supabase / Cloud Postgres) as the sole Source of Truth.
This guide documents standard operating procedures (SOP) for:
1. Database Backups (Logical `pg_dump` & Automated Snapshotting)
2. Database Restores (Disaster Recovery & Point-In-Time-Recovery)
3. Schema Migrations (Prisma Migrate & Zero-Downtime Releases)

---

## 2. Backup Procedures

### 2.1 Logical Backup via `pg_dump`
To create a full logical backup of schema and table data:

```bash
# Set database connection parameters
export PGPASSWORD="your_database_password"

# Perform full compressed backup
pg_dump \
  -h aws-0-ap-southeast-1.pooler.supabase.com \
  -p 5432 \
  -U postgres.your_project_ref \
  -d postgres \
  -F c \
  -b \
  -v \
  -f "backups/bpr_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### 2.2 Table-Specific Backups
For critical financial audit tables and parameter versions:

```bash
# Backup parameter versions and master rates only
pg_dump -U postgres -d postgres -t parameter_versions -t credit_parameters -t fee_parameters -t insurance_rates -f "backups/rates_backup_$(date +%Y%m%d).sql"

# Backup historical simulations and audit logs
pg_dump -U postgres -d postgres -t simulations -t simulation_details -t audit_logs -f "backups/audit_backup_$(date +%Y%m%d).sql"
```

### 2.3 Automated Snapshot Utility
Run the built-in TypeScript backup script:

```bash
bun run scripts/db-backup.ts
```

---

## 3. Restore & Disaster Recovery Procedures

### 3.1 Restore via `pg_restore`
To restore from a custom-format `.dump` backup:

```bash
# Clean existing database and restore full schema and data
pg_restore \
  -h aws-0-ap-southeast-1.pooler.supabase.com \
  -p 5432 \
  -U postgres.your_project_ref \
  -d postgres \
  -c \
  -v \
  "backups/bpr_backup_20260828.dump"
```

### 3.2 Point-In-Time-Recovery (PITR) on Supabase
For cloud-managed Supabase environments:
1. Navigate to **Supabase Dashboard** -> **Project Settings** -> **Database** -> **Backups**.
2. Select **Point-In-Time Recovery (PITR)**.
3. Choose the target restoration timestamp (down to the exact minute before incident).
4. Initiate restore to a temporary or primary project instance.

---

## 4. Prisma Schema Migration Procedure

### 4.1 Development Migration
```bash
bunx prisma migrate dev --name <migration_name>
```

### 4.2 Production Migration Execution
Always apply pending migrations before launching new application releases:

```bash
# In CI/CD pipeline or release entrypoint
bunx prisma migrate deploy
```

### 4.3 Migration Verification & Status Check
```bash
bunx prisma migrate status
```

---

## 5. Backup Retention & Compliance
- **Daily Snapshots:** Retained for 30 days.
- **Monthly Snapshots:** Retained for 12 months.
- **Audit Logs (`audit_logs`):** Append-only, never truncated, retained for 5+ years per financial regulatory standards (OJK/BPR).
