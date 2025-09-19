# LVJAPP
LVJ Case Management System - Professional Immigration Law Application

## Service Type Management Feature

### Overview
The Service Type Management feature allows LVJ administrators to define and manage different types of legal services offered, while providing dynamic service type selection during client intake and comprehensive integration with the notification system.

### Key Features

#### 1. Service Type Administration
- **Admin-only access**: Only users with `LVJ_ADMIN` role can manage service types
- **Full CRUD operations**: Create, read, update, and delete service types
- **Dynamic management**: Add new service types without code changes
- **Usage validation**: Cannot delete service types that are actively used by cases

#### 2. Client Intake Integration
- **Dynamic service selection**: Client intake forms automatically load available service types
- **Optional selection**: Service type selection is optional during case creation
- **Validation**: Selected service types are validated against available options
- **Case association**: Service types are linked to cases for tracking and reporting

#### 3. Enhanced Notifications
- **Service type inclusion**: Legal team notifications include service type details
- **Rich notifications**: Email notifications show service type title and description
- **Contextual information**: Helps legal team understand case nature immediately

### Technical Implementation

#### Database Schema
```sql
-- New ServiceType model
model ServiceType {
  id          String   @id @default(cuid())
  title       String   @unique
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  cases       Case[]
}

-- Updated Case model with service type relation
model Case {
  // ... existing fields
  serviceTypeId String?
  serviceType   ServiceType? @relation(fields: [serviceTypeId], references: [id])
  // ... existing relations
}
```

#### API Endpoints

##### Service Types Management
- `GET /api/service-types` - List all service types (public for intake forms)
- `POST /api/service-types` - Create new service type (admin only)
- `GET /api/service-types/[id]` - Get specific service type
- `PUT /api/service-types/[id]` - Update service type (admin only)
- `DELETE /api/service-types/[id]` - Delete service type (admin only, validates usage)

##### Enhanced Case Creation
- `POST /api/cases` - Updated to include optional `serviceTypeId` parameter
- Validates service type exists before creating case
- Sends enhanced notifications with service type details

#### UI Components

##### Admin Interface
- **Location**: `/admin/service-types`
- **Features**:
  - List all service types with pagination
  - Add new service types with title and description
  - Edit existing service types inline
  - Delete service types (with usage validation)
  - Responsive design for desktop and mobile

##### Client Intake Enhancement
- **Location**: `/cases/new`
- **Features**:
  - Dynamic service type dropdown
  - Optional selection with placeholder text
  - Real-time loading from API
  - Validation and error handling

#### Navigation Updates
- Added "Service Types" link to admin navigation
- Visible only to users with `LVJ_ADMIN` role
- Integrated with existing role-based navigation system

### Development Setup

#### Prerequisites
- Node.js 18+ 
- PostgreSQL database (or SKIP_DB=1 for development)
- Prisma CLI

#### Installation
1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your database URL and other settings
   ```

3. For development without database:
   ```bash
   # Set in .env
   SKIP_DB=1
   SKIP_AUTH=1
   ```

4. Run database migrations (if using real database):
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

### Testing

#### Automated Tests
```bash
# Run unit tests
npm run test

# Run with coverage
npm run test:coverage

# Run e2e tests
npm run test:e2e
```

#### Test Coverage
- Service type CRUD operations
- Case creation with service types
- Notification system integration
- Role-based access control
- Form validation and error handling

#### Manual Testing Checklist
- [ ] Admin can create new service types
- [ ] Admin can edit existing service types
- [ ] Admin can delete unused service types
- [ ] Admin cannot delete service types in use
- [ ] Client intake form loads service types dynamically
- [ ] Case creation works with and without service types
- [ ] Notifications include service type details
- [ ] Navigation shows service types link for admins only

### Production Deployment

#### Database Migration
1. Backup existing database
2. Run migration: `npx prisma migrate deploy`
3. Verify schema changes
4. Seed initial service types if needed

#### Feature Flag Setup
```javascript
// Future implementation
const FEATURE_FLAGS = {
  SERVICE_TYPE_MANAGEMENT: process.env.ENABLE_SERVICE_TYPES === 'true'
};
```

#### Environment Variables
```bash
# Production settings
NODE_ENV=production
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-production-secret
NEXTAUTH_URL=https://your-domain.com

# Disable development flags
SKIP_DB=0
SKIP_AUTH=0
```

### Next Steps

#### Immediate (Sprint 1)
- [ ] Add feature flag implementation
- [ ] Create staging deployment pipeline
- [ ] Set up monitoring and logging
- [ ] Add service type analytics and reporting

#### Medium Term (Sprint 2-3)
- [ ] Service type templates with default fields
- [ ] Service type-specific document requirements
- [ ] Bulk import/export functionality
- [ ] Service type usage analytics dashboard

#### Long Term (Sprint 4+)
- [ ] Service type-based pricing tiers
- [ ] Automated case routing by service type
- [ ] Integration with external legal databases
- [ ] Machine learning for service type prediction

### API Documentation

#### Service Type Object
```json
{
  "id": "st_1",
  "title": "Work Visa",
  "description": "Employment-based visa applications and renewals",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Case Object (Enhanced)
```json
{
  "id": "case_123",
  "title": "Work Visa Application - Jane Doe",
  "applicantName": "Jane Doe",
  "applicantEmail": "jane.doe@example.com",
  "serviceTypeId": "st_1",
  "serviceType": {
    "id": "st_1",
    "title": "Work Visa",
    "description": "Employment-based visa applications and renewals"
  },
  // ... other case fields
}
```

### Troubleshooting

#### Common Issues
1. **Service types not loading**: Check API endpoint and network connectivity
2. **Admin page access denied**: Verify user has `LVJ_ADMIN` role
3. **Cannot delete service type**: Check if service type is used by existing cases
4. **Notifications not working**: Verify notification system configuration

#### Development Mode
- Use `SKIP_DB=1` for mock data without database
- Use `SKIP_AUTH=1` to bypass authentication checks
- Check console for mock notification outputs

### Contributing
1. Fork the repository
2. Create feature branch: `git checkout -b feature/service-type-enhancement`
3. Make changes and add tests
4. Run test suite: `npm run test:all`
5. Submit pull request with detailed description

### Support
For technical support or questions about the Service Type Management feature, contact the development team or create an issue in the repository.
