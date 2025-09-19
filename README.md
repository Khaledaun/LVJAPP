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

## Traffic Light Status UI Enhancement

### Overview
The Traffic Light Status UI Enhancement introduces an accessible, color-coded visual system for case and task statuses throughout the application. Using the universal traffic light pattern (red, yellow, green, gray), this enhancement improves status visibility while maintaining full accessibility compliance.

### Features
- **Universal Traffic Light Pattern**: Intuitive color coding based on status urgency and completion
- **Full Accessibility Support**: Icons, high contrast colors, and ARIA labels for screen readers
- **Color-blind Friendly**: Icons and patterns complement colors for accessibility
- **Feature Flag Controlled**: Safe rollout with `NEXT_PUBLIC_ENABLE_TRAFFIC_LIGHT_STATUS` environment variable
- **Backward Compatible**: Graceful fallback to existing status badges when disabled
- **Responsive Design**: Works across all device sizes with appropriate scaling

### Color Mapping

#### 🔴 Red (Critical/Blocked)
- `blocked` - Process is stopped due to external factors
- `rejected` - Item has been declined or refused
- `failed` - Process has encountered an error
- `overdue` - Past due date, requires immediate attention
- `denied` - Formal rejection or denial

#### 🟡 Yellow (In Progress/Pending)
- `in_progress` - Currently being worked on
- `pending_review` - Awaiting review or approval
- `awaiting` - Waiting for external input
- `documents_pending` - Missing required documents
- `in_review` - Under active review
- `submitted` - Submitted and awaiting response

#### 🟢 Green (Complete/Approved)
- `completed` - Task or process finished successfully
- `approved` - Formally approved or accepted
- `active` - Currently active and functioning
- `paid` - Payment completed

#### ⚪ Gray (Not Started/Inactive)
- `not_started` - Not yet begun
- `draft` - In draft/preparation stage
- `inactive` - Temporarily inactive

### Implementation

#### TrafficLightBadge Component
```tsx
import { TrafficLightBadge } from '@/components/ui/TrafficLightBadge'

// Basic usage
<TrafficLightBadge status="in_progress" />

// With customization
<TrafficLightBadge 
  status="completed" 
  size="lg"
  showIcon={true}
  showText={true}
/>

// Icon only for compact display
<TrafficLightBadge status="blocked" showText={false} />
```

#### Updated Components
The following components have been enhanced with traffic light status:

1. **StatusTimeline Components**
   - `/components/journey/StatusTimeline.tsx`
   - `/module2-gemini/components/StatusTimeline.tsx`

2. **Case Detail Views**
   - Document status in `/app/cases/[id]/page.tsx`
   - Case overview status badges

3. **Admin Dashboard**
   - Status indicators throughout the admin interface

#### Feature Flag Configuration
```bash
# Enable traffic light status UI (default: true)
NEXT_PUBLIC_ENABLE_TRAFFIC_LIGHT_STATUS=true

# Disable to fall back to legacy badges
NEXT_PUBLIC_ENABLE_TRAFFIC_LIGHT_STATUS=false
```

#### Usage with Feature Flag
```tsx
import { useTrafficLightFeature } from '@/components/ui/TrafficLightBadge'

function MyComponent() {
  const isTrafficLightEnabled = useTrafficLightFeature()
  
  return (
    <div>
      {isTrafficLightEnabled ? (
        <TrafficLightBadge status="in_progress" />
      ) : (
        <span className="legacy-badge">in_progress</span>
      )}
    </div>
  )
}
```

### Accessibility Features

#### High Contrast Colors
All status badges use high contrast color combinations meeting WCAG 2.1 AA standards:
- Light backgrounds with dark text for readability
- Dark mode support with appropriate color inversions
- Minimum 4.5:1 contrast ratio for normal text

#### Screen Reader Support
- Semantic `role="status"` attributes
- Descriptive `aria-label` including color information
- Example: `"Status: In Progress (yellow light)"`

#### Color-blind Support
- Icons accompany all colors for non-color identification
- Distinct icon shapes for each status category
- Pattern-based visual differences

#### Keyboard Navigation
- Focus ring indicators for keyboard users
- Focusable badges with proper focus management

### Testing

#### Unit Tests
```bash
# Test the TrafficLightBadge component
npm run test -- __tests__/TrafficLightBadge.test.tsx

# Test StatusTimeline integration
npm run test -- __tests__/StatusTimeline.test.tsx
```

#### Visual Testing
Visit the demo page to see all variations:
```
http://localhost:3000/demo/traffic-light
```

#### Test Coverage
- ✅ Color mapping for all status types
- ✅ Icon rendering and accessibility
- ✅ Size variants (sm, md, lg)
- ✅ Feature flag integration
- ✅ Backward compatibility
- ✅ Screen reader compatibility
- ✅ High contrast color validation

### Production Deployment

#### Staging Test Plan
1. **Environment Setup**
   ```bash
   NEXT_PUBLIC_ENABLE_TRAFFIC_LIGHT_STATUS=true
   ```

2. **Visual Regression Testing**
   - Compare status displays across all pages
   - Test with screen readers (NVDA, JAWS, VoiceOver)
   - Validate color contrast with tools like WebAIM

3. **Accessibility Testing**
   - Keyboard navigation verification
   - Screen reader announcement testing
   - Color-blind simulation testing

4. **Performance Impact**
   - Monitor bundle size increase
   - Verify rendering performance

#### Gradual Rollout Strategy
1. **Phase 1**: Deploy with feature flag disabled
2. **Phase 2**: Enable for admin users only
3. **Phase 3**: Enable for all users
4. **Phase 4**: Remove legacy code after validation

#### Rollback Plan
If issues are discovered:
```bash
# Immediate rollback via environment variable
NEXT_PUBLIC_ENABLE_TRAFFIC_LIGHT_STATUS=false
```

### Browser Support
- ✅ Chrome 90+ (Chromium-based browsers)
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

### Performance Impact
- **Bundle Size**: ~3KB additional (compressed)
- **Runtime Performance**: Negligible impact
- **Memory Usage**: No significant increase
- **Rendering**: Same as legacy badges

### Future Enhancements

#### Phase 2 Features (Next Sprint)
- [ ] Animated status transitions
- [ ] Status history tooltip on hover
- [ ] Bulk status update operations
- [ ] Custom status color theming

#### Phase 3 Features (Future)
- [ ] Sound indicators for accessibility
- [ ] Status pattern customization
- [ ] Integration with notification system
- [ ] Analytics on status distributions

### Technical Notes

#### Dependencies
- `lucide-react` - For accessibility icons
- `class-variance-authority` - For variant management
- `clsx` - For conditional class names

#### Bundle Impact
The enhancement adds minimal overhead:
- Icons are tree-shaken and only included when used
- CSS classes are purged if unused
- Component is lazy-loaded where possible

#### Migration Guide
Existing status badge implementations will continue working unchanged. To migrate:

1. **Replace hardcoded badges**:
   ```tsx
   // Before
   <span className="bg-green-200 text-green-800">completed</span>
   
   // After
   <TrafficLightBadge status="completed" />
   ```

2. **Update status mappings**:
   ```tsx
   // Map existing statuses to traffic light statuses
   const mapToTrafficLight = (status: string): TrafficLightStatus => {
     switch (status) {
       case 'done': return 'completed'
       case 'working': return 'in_progress'
       case 'stuck': return 'blocked'
       default: return 'not_started'
     }
   }
   ```

### Troubleshooting

#### Common Issues
1. **Icons not displaying**: Ensure `lucide-react` is installed
2. **Styles not applying**: Check Tailwind CSS configuration
3. **Feature flag not working**: Verify environment variable is set

#### Debug Mode
```tsx
// Enable debug logging
const isTrafficLightEnabled = useTrafficLightFeature()
console.log('Traffic Light Feature:', isTrafficLightEnabled)
```

### Contributing
When adding new status types:
1. Update the `TrafficLightStatus` type
2. Add appropriate color mapping
3. Include icon selection logic
4. Add test cases for new statuses
5. Update documentation

## Status Change Notification System

### Overview
The Status Change Notification System automatically notifies LVJ Admin when case statuses are updated, providing real-time visibility into case progression and enabling prompt administrative action.

### Features
- **Real-time Notifications**: Automatic email notifications to admin when case status changes
- **Comprehensive Details**: Includes case ID, applicant info, previous/new status, timestamp, and direct links
- **Feature Flag Support**: Safe rollout capability with `ENABLE_STATUS_NOTIFICATIONS` environment variable
- **Audit Logging**: Complete audit trail of all status changes for compliance and debugging
- **Development Mode**: Mock notifications for testing without email delivery

### API Endpoint
```
PATCH /api/cases/[id]/status
```

**Request:**
```json
{
  "status": "new|documents_pending|in_review|submitted|approved|denied"
}
```

**Response:**
```json
{
  "case": { /* updated case object */ },
  "notificationSent": true,
  "previousStatus": "new",
  "newStatus": "in_review"
}
```

### Configuration

#### Environment Variables
```bash
# Feature flag for status change notifications (default: true)
ENABLE_STATUS_NOTIFICATIONS=true

# Admin email for notifications (configured in lib/notifications.ts)
# Default: admin@lvj.com
```

#### Authorization
- **Required Role**: `STAFF` or `ADMIN`
- **Access Control**: Users can only update cases they manage (staff) or all cases (admin)

### Testing

#### Automated Tests
```bash
# Run status change notification tests
npm run test -- --testPathPatterns=status-change-notifications

# Run all tests
npm run test:all
```

#### Manual Testing
```bash
# Test notification system
node scripts/test-status-notifications.js

# Test with feature flag disabled
ENABLE_STATUS_NOTIFICATIONS=false node scripts/test-status-notifications.js
```

#### Development Mode Testing
```bash
# Enable development mode with mock notifications
SKIP_DB=1 SKIP_AUTH=1 npm run dev

# Update case status via API (requires authentication in non-dev mode)
curl -X PATCH http://localhost:3000/api/cases/[case-id]/status \
  -H "Content-Type: application/json" \
  -d '{"status":"approved"}'
```

### Notification Content

**Email Subject:**
```
Case Status Change: [Case Title] → [New Status]
```

**Email Content Includes:**
- Case title and ID
- Applicant name and email
- Service type (if applicable)
- Previous and new status
- Changed by (user who made the change)
- Timestamp of change
- Direct link to case details

### Audit Logging

All status changes are logged with:
- Case ID and user who made the change
- Previous and new status values
- Timestamp and feature flag status
- Environment mode (development/production)

**Log Format:**
```
📋 STATUS CHANGE AUDIT LOG
==========================
Case ID: case_123
User: Admin User (user-id)
Previous Status: new
New Status: approved
Timestamp: 2024-01-15T10:30:00.000Z
Feature Flag: ENABLED
Mode: PRODUCTION
```

### Staging Test Plan

#### Pre-Production Checklist
1. **Environment Setup**
   - [ ] Set `ENABLE_STATUS_NOTIFICATIONS=true` in staging
   - [ ] Configure admin email addresses
   - [ ] Verify database connectivity

2. **Functional Testing**
   - [ ] Test all valid status transitions
   - [ ] Verify notification content and formatting
   - [ ] Test authorization controls (STAFF vs ADMIN access)
   - [ ] Validate audit logging output

3. **Integration Testing**
   - [ ] Test with existing case management workflow
   - [ ] Verify email delivery (check spam folders)
   - [ ] Test feature flag toggle (enable/disable)

4. **Error Handling**
   - [ ] Test with invalid status values
   - [ ] Test unauthorized access attempts
   - [ ] Verify graceful degradation when email service fails

5. **Performance Testing**
   - [ ] Test notification sending under load
   - [ ] Verify no impact on case update performance

#### Production Deployment Steps
1. Deploy with `ENABLE_STATUS_NOTIFICATIONS=false` initially
2. Monitor application logs for any errors
3. Enable feature flag: `ENABLE_STATUS_NOTIFICATIONS=true`
4. Monitor notification delivery and audit logs
5. Verify admin team receives notifications correctly

### Troubleshooting

#### Common Issues
1. **Notifications not being sent**: Check `ENABLE_STATUS_NOTIFICATIONS` environment variable
2. **Email not received**: Verify admin email configuration in `lib/notifications.ts`
3. **Access denied errors**: Ensure user has `STAFF` or `ADMIN` role
4. **Status update fails**: Check valid status values in API documentation

#### Debug Commands
```bash
# Check current feature flag status
echo $ENABLE_STATUS_NOTIFICATIONS

# View audit logs (check application logs)
grep "STATUS CHANGE AUDIT LOG" /var/log/application.log

# Test notification function directly
node -e "require('./lib/notifications').mockStatusChangeNotification({...})"
```

### Next Steps

#### Immediate (Sprint 1)
- [ ] Deploy to staging environment
- [ ] Configure production email settings
- [ ] Set up monitoring for notification delivery
- [ ] Create admin dashboard for notification history

#### Medium Term (Sprint 2-3)
- [ ] Add notification preferences for different status types
- [ ] Implement notification batching for high-volume periods
- [ ] Add webhook support for external integrations
- [ ] Create notification templates for different case types

#### Long Term (Sprint 4+)
- [ ] Add SMS notification option
- [ ] Implement notification routing based on case assignment
- [ ] Add machine learning for priority-based notifications
- [ ] Create comprehensive notification analytics dashboard
