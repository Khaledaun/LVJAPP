# Status Change Notification System - Staging Test Plan

## Overview
This document outlines the comprehensive testing plan for the Status Change Notification System before production deployment.

## Pre-Test Setup

### Environment Configuration
```bash
# Required environment variables
ENABLE_STATUS_NOTIFICATIONS=true
NEXTAUTH_URL=https://staging.lvj.com
DATABASE_URL=postgresql://staging_db_connection
```

### Test Data Preparation
- Create test cases with different statuses
- Prepare test user accounts (STAFF, ADMIN, CLIENT roles)
- Configure test email addresses for notification delivery

## Test Scenarios

### 1. Authentication & Authorization Tests

#### 1.1 Unauthenticated Request
```bash
curl -X PATCH https://staging.lvj.com/api/cases/test-case-1/status \
  -H "Content-Type: application/json" \
  -d '{"status":"approved"}'

Expected: 401 Unauthorized
```

#### 1.2 CLIENT Role Access (Should Fail)
```bash
# Login as CLIENT user, then:
curl -X PATCH https://staging.lvj.com/api/cases/test-case-1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [client-token]" \
  -d '{"status":"approved"}'

Expected: 403 Forbidden
```

#### 1.3 STAFF Role Access (Should Succeed for Owned Cases)
```bash
# Login as STAFF user, then:
curl -X PATCH https://staging.lvj.com/api/cases/[staff-owned-case]/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [staff-token]" \
  -d '{"status":"approved"}'

Expected: 200 OK + notification sent
```

#### 1.4 ADMIN Role Access (Should Succeed for All Cases)
```bash
# Login as ADMIN user, then:
curl -X PATCH https://staging.lvj.com/api/cases/[any-case]/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [admin-token]" \
  -d '{"status":"approved"}'

Expected: 200 OK + notification sent
```

### 2. Status Validation Tests

#### 2.1 Valid Status Values
Test each valid status:
- `new`
- `documents_pending`
- `in_review`
- `submitted`
- `approved`
- `denied`

#### 2.2 Invalid Status Values
```bash
curl -X PATCH https://staging.lvj.com/api/cases/test-case-1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [admin-token]" \
  -d '{"status":"invalid_status"}'

Expected: 400 Bad Request with error message
```

#### 2.3 Missing Status Field
```bash
curl -X PATCH https://staging.lvj.com/api/cases/test-case-1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [admin-token]" \
  -d '{}'

Expected: 400 Bad Request
```

### 3. Notification Delivery Tests

#### 3.1 Notification Content Verification
Update a case status and verify email contains:
- [ ] Correct subject line format
- [ ] Case title and ID
- [ ] Applicant name and email
- [ ] Service type information
- [ ] Previous and new status
- [ ] User who made the change
- [ ] Timestamp
- [ ] Direct link to case

#### 3.2 Service Type Scenarios
Test notifications for cases:
- [ ] With service type assigned
- [ ] Without service type (should show "Not specified")

#### 3.3 Email Delivery
- [ ] Check admin inbox for notification
- [ ] Verify email formatting (HTML rendering)
- [ ] Test direct link functionality
- [ ] Check spam folder if not received

### 4. Feature Flag Tests

#### 4.1 Feature Flag Enabled (Default)
```bash
ENABLE_STATUS_NOTIFICATIONS=true
# Update case status and verify notification is sent
```

#### 4.2 Feature Flag Disabled
```bash
ENABLE_STATUS_NOTIFICATIONS=false
# Update case status and verify:
# - Status update succeeds
# - No notification is sent
# - Response indicates notificationSent: false
```

### 5. Audit Logging Tests

#### 5.1 Verify Audit Log Format
Check application logs for entries like:
```
📋 STATUS CHANGE AUDIT LOG
==========================
Case ID: [case-id]
User: [user-name] ([user-id])
Previous Status: [old-status]
New Status: [new-status]
Timestamp: [ISO-timestamp]
Feature Flag: ENABLED/DISABLED
Mode: PRODUCTION
```

#### 5.2 Log Content Verification
- [ ] All required fields present
- [ ] Correct user identification
- [ ] Accurate timestamp
- [ ] Feature flag status matches configuration

### 6. Error Handling Tests

#### 6.1 Non-existent Case
```bash
curl -X PATCH https://staging.lvj.com/api/cases/non-existent-case/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [admin-token]" \
  -d '{"status":"approved"}'

Expected: 404 Not Found
```

#### 6.2 Email Service Failure Simulation
Temporarily misconfigure email service and verify:
- [ ] Status update still succeeds
- [ ] Error logged but not thrown to user
- [ ] Response indicates notificationSent: false

#### 6.3 Database Connection Issues
Test behavior during database connectivity problems

### 7. Performance Tests

#### 7.1 Response Time
Measure API response time for status updates:
- [ ] With notifications enabled
- [ ] With notifications disabled
- [ ] Compare to baseline performance

#### 7.2 Concurrent Updates
Test multiple simultaneous status updates:
- [ ] All updates process correctly
- [ ] All notifications sent
- [ ] No race conditions in audit logging

### 8. Integration Tests

#### 8.1 Existing Workflow Integration
- [ ] Status updates via UI still work
- [ ] Notifications don't interfere with other features
- [ ] Database integrity maintained

#### 8.2 Multiple Status Changes
Test rapid status changes on same case:
- [ ] Each change triggers separate notification
- [ ] Audit trail shows all changes
- [ ] No notification flooding or throttling needed

## Test Execution Checklist

### Pre-Execution
- [ ] Staging environment deployed with latest code
- [ ] Test data prepared
- [ ] Email service configured
- [ ] Test user accounts ready
- [ ] Monitoring tools active

### During Testing
- [ ] Document all test results
- [ ] Capture screenshots of notifications
- [ ] Monitor application logs
- [ ] Track response times
- [ ] Note any anomalies

### Post-Execution
- [ ] All tests passed or issues documented
- [ ] Performance metrics within acceptable ranges
- [ ] Email delivery confirmed
- [ ] Audit logs complete and accurate
- [ ] Ready for production deployment

## Success Criteria

✅ **All authentication/authorization tests pass**
✅ **Status validation working correctly**
✅ **Notifications delivered with correct content**
✅ **Feature flag controls working**
✅ **Audit logging complete and accurate**
✅ **Error handling graceful**
✅ **Performance within acceptable limits**
✅ **No regressions in existing functionality**

## Post-Testing Actions

### If All Tests Pass
1. Update production deployment plan
2. Schedule production deployment
3. Prepare production monitoring
4. Update team documentation

### If Tests Fail
1. Document all failures
2. Create bug reports
3. Fix issues and re-test
4. Update code and re-deploy to staging
5. Repeat testing cycle

## Production Deployment Steps

1. **Pre-deployment**
   - Deploy with `ENABLE_STATUS_NOTIFICATIONS=false`
   - Monitor for any deployment issues

2. **Gradual Rollout**
   - Enable feature flag: `ENABLE_STATUS_NOTIFICATIONS=true`
   - Monitor first few notifications
   - Verify admin team receives emails

3. **Full Activation**
   - Confirm all systems working
   - Update team on new functionality
   - Monitor for 24-48 hours

4. **Post-deployment**
   - Collect feedback from admin team
   - Monitor notification delivery rates
   - Plan future enhancements