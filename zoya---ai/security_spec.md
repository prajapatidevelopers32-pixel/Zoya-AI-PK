# Security Specification & Test Cases (TDD)

This document outlines the security invariants, the "Dirty Dozen" malicious payload attempts to bypass security, and the test strategy for the Firestore security rules.

## Data Invariants

1. **Authentication Required**: All read and write operations require a signed-in user.
2. **Session Ownership**: A user can only create, read, update, or delete sessions where the `userId` matches their authenticated UID.
3. **Session Immutability**: The `userId` and `createdAt` of a session cannot be modified after creation.
4. **Message Parent Alignment**: A user can only read, list, or create messages inside a session they own.
5. **Message Immutability**: Messages cannot be updated or deleted once created.
6. **Temporal Integrity**: `createdAt` and `updatedAt` must match the server-generated `request.time`.
7. **Strict Schema Constraints**: Message senders must only be "user" or "zoya". No phantom properties are allowed on creation.

---

## The "Dirty Dozen" Malicious Payloads

The following payloads attempt to violate our data invariants and must be rejected with `PERMISSION_DENIED`.

### Case 1: Session Creation - Identity Spoofing (Unauthenticated)
An unauthenticated attacker tries to create a session.
* **Payload**: `{ "id": "session_123", "userId": "victim_uid", "title": "Hack", "createdAt": "2026-07-06T00:00:00Z", "updatedAt": "2026-07-06T00:00:00Z" }`
* **Expected Result**: `PERMISSION_DENIED`

### Case 2: Session Creation - Identity Spoofing (Authenticated as Other)
An attacker (UID `attacker_uid`) tries to create a session owned by `victim_uid`.
* **Payload**: `{ "id": "session_123", "userId": "victim_uid", "title": "Hack", "createdAt": "2026-07-06T00:00:00Z", "updatedAt": "2026-07-06T00:00:00Z" }`
* **Expected Result**: `PERMISSION_DENIED`

### Case 3: Session Creation - Unverified Email
A user with an unverified email tries to write a session.
* **Payload**: `{ "id": "session_123", "userId": "unverified_uid", "title": "Hack", "createdAt": "2026-07-06T00:00:00Z", "updatedAt": "2026-07-06T00:00:00Z" }` (with auth token `email_verified: false`)
* **Expected Result**: `PERMISSION_DENIED`

### Case 4: Session Creation - Client-Side Timestamp Spoofing
A user tries to set `createdAt` in the past/future rather than using the server timestamp.
* **Payload**: `{ "id": "session_123", "userId": "user_uid", "title": "Normal", "createdAt": "2020-01-01T00:00:00Z", "updatedAt": "2026-07-06T00:00:00Z" }`
* **Expected Result**: `PERMISSION_DENIED`

### Case 5: Session Creation - Missing Required Field
A user tries to create a session missing the `title` field.
* **Payload**: `{ "id": "session_123", "userId": "user_uid", "createdAt": "request.time", "updatedAt": "request.time" }`
* **Expected Result**: `PERMISSION_DENIED`

### Case 6: Session Creation - Shadow Fields
A user tries to inject a phantom field (`isAdmin: true`) into a session.
* **Payload**: `{ "id": "session_123", "userId": "user_uid", "title": "Hack", "createdAt": "request.time", "updatedAt": "request.time", "isAdmin": true }`
* **Expected Result**: `PERMISSION_DENIED`

### Case 7: Session Update - Owner Hijacking
A user tries to change the ownership (`userId`) of an existing session.
* **Payload**: `{ "id": "session_123", "userId": "attacker_uid", "title": "Normal", "createdAt": "request.time", "updatedAt": "request.time" }` -> attempt to update to `{ "userId": "other_uid" }`
* **Expected Result**: `PERMISSION_DENIED`

### Case 8: Session Update - Invalid Type injection
An attacker tries to update the `title` field to an array of objects or an oversized 1MB string.
* **Payload**: `{ "title": ["malicious", "list"] }`
* **Expected Result**: `PERMISSION_DENIED`

### Case 9: Message Creation - Inside Another User's Session
An attacker tries to post a message to a session owned by another user.
* **Payload**: `{ "id": "msg_1", "sender": "user", "text": "Hello", "createdAt": "request.time" }` written to `/sessions/victim_session_123/messages/msg_1`
* **Expected Result**: `PERMISSION_DENIED`

### Case 10: Message Creation - Invalid Sender Enum
A user tries to inject a message with an invalid sender (e.g. "hacker" or "admin").
* **Payload**: `{ "id": "msg_1", "sender": "hacker", "text": "Hello", "createdAt": "request.time" }`
* **Expected Result**: `PERMISSION_DENIED`

### Case 11: Message Update - Immutability Breach
A user tries to edit or tamper with an existing sent message.
* **Payload**: `{ "text": "Modified text" }`
* **Expected Result**: `PERMISSION_DENIED`

### Case 12: Message Delete - Immutability Breach
A user tries to delete a message.
* **Expected Result**: `PERMISSION_DENIED`
