# Implementation Plan: AI Booking Voice Assistant

## Overview

This implementation plan breaks down the AI Booking Voice Assistant into discrete, manageable tasks following Clean Architecture principles. The plan prioritizes core booking functionality first, then adds AI capabilities, voice integration, and finally the embeddable widget. Each task builds incrementally on previous work to ensure a working system at each stage.

## Tasks

- [x] 1. Set up monorepo structure and core infrastructure
  - Create PNPM workspace with apps (backend, frontend, widget) and packages (shared)
  - Set up TypeScript configuration with strict mode across all packages
  - Configure Vite build tool for all applications
  - Set up Prisma ORM with PostgreSQL schema
  - Create shared types package with booking and API interfaces
  - _Requirements: 10.1, 10.3, 10.4, 10.5_

- [x] 1.1 Write property test for monorepo type sharing
  - **Property 14: Widget API Type Safety**
  - **Validates: Requirements 7.5, 10.3**

- [x] 2. Implement core booking service and database layer
  - [x] 2.1 Create Prisma schema with Booking and Document models
    - Define booking fields (id, name, email, phone, inquiry, startTime, duration, status)
    - Add indexes for performance on startTime and email fields
    - Set up database migrations
    - _Requirements: 8.1, 8.2, 8.5_

  - [x] 2.2 Implement BookingRepository with Prisma
    - Create CRUD operations for booking management
    - Implement availability checking with time slot conflicts
    - Add transaction support for atomic operations
    - _Requirements: 1.2, 8.3_

  - [x] 2.3 Write property test for booking creation completeness
    - **Property 1: Booking Creation Completeness**
    - **Validates: Requirements 1.1, 1.4, 8.2**

  - [x] 2.4 Write property test for double booking prevention
    - **Property 2: Double Booking Prevention**
    - **Validates: Requirements 1.2, 1.3**

  - [x] 2.5 Implement BookingService with business logic
    - Create booking validation and creation logic
    - Implement availability checking with conflict detection
    - Add booking status management with state transitions
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.4_

  - [x] 2.6 Write property test for valid duration enforcement
    - **Property 3: Valid Duration Enforcement**
    - **Validates: Requirements 1.5**

  - [x] 2.7 Write property test for booking status state machine
    - **Property 15: Booking Status State Machine**
    - **Validates: Requirements 8.4**

- [x] 3. Implement external service integrations
  - [x] 3.1 Create GoogleCalendarService with rate limiting
    - Implement Google Calendar API integration using googleapis
    - Add Bottleneck rate limiting with exponential backoff
    - Create event CRUD operations (create, update, delete)
    - Store calendar event IDs in booking records
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.2 Write property test for calendar event synchronization
    - **Property 4: Calendar Event Synchronization**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

  - [x] 3.3 Create HubSpotService for CRM integration
    - Implement HubSpot API integration for contact management
    - Add create or update contact functionality
    - Include booking metadata in contact properties
    - Store CRM contact IDs in booking records
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [x] 3.4 Write property test for CRM contact integration
    - **Property 5: CRM Contact Integration**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.5**

  - [x] 3.5 Write property test for CRM failure graceful degradation
    - **Property 6: CRM Failure Graceful Degradation**
    - **Validates: Requirements 3.4**

- [x] 4. Implement Express.js API with error handling
  - [x] 4.1 Create Express server with middleware stack
    - Set up Express.js with TypeScript
    - Add CORS, body parsing, and security middleware
    - Implement centralized error handling middleware
    - Add Winston logging with structured output
    - _Requirements: 9.1, 9.3_

  - [x] 4.2 Create BookingController with validation
    - Implement REST endpoints for booking operations
    - Add Zod schema validation for request/response
    - Integrate with BookingService for business logic
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 4.3 Write property test for structured error responses
    - **Property 17: Structured Error Responses**
    - **Validates: Requirements 9.2, 9.3, 9.4**

  - [x] 4.4 Add rate limiting and environment validation
    - Implement rate limiting middleware using express-rate-limit
    - Add startup environment variable validation
    - Fail fast on missing required environment variables
    - _Requirements: 9.5, 11.4_

  - [x] 4.5 Write property test for rate limiting protection
    - **Property 18: Rate Limiting Protection**
    - **Validates: Requirements 11.4**

  - [x] 4.6 Write unit test for environment validation
    - **Property 19: Environment Validation Round Trip**
    - **Validates: Requirements 9.5, 11.3**

- [x] 5. Checkpoint - Core booking system functional
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement AI services and RAG capabilities
  - [x] 6.1 Create KnowledgeService for document management
    - Implement document embedding using vector similarity
    - Create simple vector search functionality
    - Add document indexing from knowledge base files
    - Implement context injection for AI prompts
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 6.2 Write property test for document similarity search
    - **Property 12: Document Similarity Search**
    - **Validates: Requirements 6.2, 6.4**

  - [ ] 6.3 Create GeminiService with function calling
    - Implement Google Gemini API integration
    - Add function calling support for booking operations
    - Define function schemas for book_appointment and check_availability
    - Implement function execution and response generation
    - _Requirements: 5.1, 5.2, 5.5_

  - [ ] 6.4 Create AIService for chat processing
    - Implement chat message processing with context management
    - Integrate GeminiService and KnowledgeService
    - Add conversation context preservation across sessions
    - Implement booking intent detection and function calling
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 6.5 Write property test for AI message processing
    - **Property 9: AI Message Processing**
    - **Validates: Requirements 5.1, 5.2, 5.5**

  - [ ] 6.6 Write property test for conversation context preservation
    - **Property 10: Conversation Context Preservation**
    - **Validates: Requirements 5.4**

  - [ ] 6.7 Write property test for RAG knowledge integration
    - **Property 11: RAG Knowledge Integration**
    - **Validates: Requirements 5.3, 6.1, 6.3, 6.5**

- [x] 7. Implement voice assistant integration
  - [x] 7.1 Create RetellService for webhook processing
    - Implement Retell AI webhook signature verification
    - Add webhook payload parsing and validation
    - Create voice function call extraction from transcripts
    - _Requirements: 4.1, 4.2_

  - [x] 7.2 Create VoiceService for voice interactions
    - Implement voice booking request processing
    - Integrate with BookingService for appointment creation
    - Add spoken confirmation response generation
    - Handle voice function calls and responses
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 7.3 Write property test for voice webhook processing
    - **Property 7: Voice Webhook Processing**
    - **Validates: Requirements 4.1, 4.2**

  - [x] 7.4 Write property test for voice booking integration
    - **Property 8: Voice Booking Integration**
    - **Validates: Requirements 4.3, 4.4**

- [ ] 8. Create API endpoints for AI and voice services
  - [ ] 8.1 Add AI chat endpoints to Express router
    - Create POST /api/chat endpoint for message processing
    - Integrate with AIService for response generation
    - Add session management for conversation context
    - _Requirements: 5.1, 5.4_

  - [ ] 8.2 Add voice webhook endpoints
    - Create POST /api/voice/webhook for Retell AI integration
    - Add webhook signature verification middleware
    - Integrate with VoiceService for processing
    - _Requirements: 4.1_

  - [ ] 8.3 Write property test for service operation logging
    - **Property 20: Service Operation Logging**
    - **Validates: Requirements 9.3**

- [ ] 9. Checkpoint - AI and voice services functional
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement React frontend application
  - [ ] 10.1 Create React app with TypeScript and TailwindCSS
    - Set up React 19 with Vite build configuration
    - Add TailwindCSS for styling
    - Create shared component library
    - Set up routing and state management
    - _Requirements: 7.4_

  - [ ] 10.2 Build booking interface components
    - Create booking form with validation
    - Add date/time picker with availability checking
    - Implement booking confirmation and status display
    - Use shared types from packages/shared
    - _Requirements: 1.1, 1.2, 7.5_

  - [ ] 10.3 Add chat interface for AI assistant
    - Create chat UI with message history
    - Integrate with backend AI chat endpoints
    - Add typing indicators and message status
    - Implement conversation context management
    - _Requirements: 5.1, 5.4_

- [ ] 11. Implement embeddable widget
  - [ ] 11.1 Create widget with Shadow DOM isolation
    - Build standalone widget using React and Shadow DOM
    - Implement CSS isolation to prevent style conflicts
    - Create iframe and script tag embedding options
    - Add responsive design for mobile and desktop
    - _Requirements: 7.1, 7.2, 7.4_

  - [ ] 11.2 Write property test for widget style isolation
    - **Property 13: Widget Style Isolation**
    - **Validates: Requirements 7.2**

  - [ ] 11.3 Add widget API communication
    - Implement API client using shared TypeScript types
    - Add error handling and retry logic
    - Create widget configuration options
    - Ensure independent operation when embedded
    - _Requirements: 7.1, 7.5_

  - [ ] 11.4 Write unit test for widget embedding scenarios
    - Test iframe and script tag embedding
    - **Validates: Requirements 7.1**

- [ ] 12. Add database referential integrity and migrations
  - [ ] 12.1 Implement database constraints and indexes
    - Add foreign key constraints for external service IDs
    - Create database indexes for performance optimization
    - Implement data validation at database level
    - _Requirements: 8.3, 8.5_

  - [ ] 12.2 Write property test for database referential integrity
    - **Property 16: Database Referential Integrity**
    - **Validates: Requirements 8.3**

  - [ ] 12.3 Create database migration scripts
    - Set up automatic migration execution on deployment
    - Add seed data for development and testing
    - Create rollback procedures for migrations
    - _Requirements: 11.2_

  - [ ] 12.4 Write unit test for database migrations
    - Test migration execution and rollback
    - **Validates: Requirements 11.2**

- [ ] 13. Final integration and deployment preparation
  - [ ] 13.1 Wire all services together in main application
    - Connect all services through dependency injection
    - Add service health checks and monitoring
    - Implement graceful shutdown procedures
    - Create production configuration management
    - _Requirements: 9.4, 11.1_

  - [ ] 13.2 Add comprehensive integration tests
    - Create end-to-end booking workflow tests
    - Test AI chat and voice integration flows
    - Add widget embedding and functionality tests
    - Validate external service integration
    - _Requirements: All requirements_

  - [ ] 13.3 Write integration tests for complete user workflows
    - Test booking creation through all channels (web, voice, widget)
    - Test AI assistant with RAG responses
    - Test external service synchronization

- [ ] 14. Final checkpoint - Complete system validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive quality assurance from the start
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at major milestones
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples and edge cases
- Integration tests validate complete user workflows
- The implementation follows Clean Architecture with clear separation of concerns
