# Implementation Plan: AI-Powered Chat and Voice Booking Assistant

## Overview

This implementation plan converts the AI-powered Chat and Voice Booking Assistant design into a series of incremental coding tasks using JavaScript/Node.js. Each task builds on previous work to create a production-ready system with comprehensive testing and Railway deployment capability.

## Tasks

- [x] 1. Project Setup and Core Infrastructure

  - Initialize Node.js project with package.json
  - Set up Express.js server with basic middleware
  - Configure environment variable loading with dotenv
  - Create basic folder structure (services/, routes/, middleware/, utils/)
  - Set up basic error handling middleware
  - _Requirements: 7.1, 7.5, 8.2_

- [ ]\* 1.1 Set up testing framework and basic project tests

  - Install and configure Jest for unit testing
  - Install and configure fast-check for property-based testing
  - Create basic health check endpoint test
  - _Requirements: 8.5_

- [x] 2. AI Service Implementation

  - [x] 2.1 Implement Gemini AI integration service

    - Install @google/generative-ai package
    - Create AIService class with generateResponse method
    - Implement company-scoped response generation
    - Add conversation context management
    - _Requirements: 1.1, 1.2_

  - [ ]\* 2.2 Write property test for AI response generation

    - **Property 1: AI Response Generation and Scoping**
    - **Validates: Requirements 1.1, 1.2, 1.5**

  - [x] 2.3 Add booking intent detection and information extraction

    - Implement isBookingIntent method
    - Implement extractBookingInfo method
    - Add graceful fallback responses
    - _Requirements: 1.3, 1.5_

  - [ ]\* 2.4 Write unit tests for AI service methods
    - Test booking intent detection with various inputs
    - Test information extraction accuracy
    - Test fallback response scenarios
    - _Requirements: 1.3_

- [x] 3. Input Validation and Security Middleware

  - [x] 3.1 Implement input validation middleware

    - Create validation functions for all input types
    - Add input sanitization to prevent injection attacks
    - Implement rate limiting middleware
    - _Requirements: 1.4, 9.1, 9.2_

  - [ ]\* 3.2 Write property test for input validation

    - **Property 2: Input Validation and Security**
    - **Validates: Requirements 1.4, 7.4, 9.1, 9.5**

  - [ ]\* 3.3 Write property test for rate limiting
    - **Property 11: Rate Limiting and Security Controls**
    - **Validates: Requirements 9.2, 9.4**

- [x] 4. Booking System Core Implementation

  - [x] 4.1 Create BookingService class with data validation

    - Implement booking data structure and validation
    - Add time slot validation logic
    - Implement meeting duration constraints (15, 30, 45, 60 minutes)
    - _Requirements: 2.3, 2.5_

  - [ ]\* 4.2 Write property test for booking data collection

    - **Property 3: Complete Booking Data Collection**
    - **Validates: Requirements 2.1, 2.2**

  - [ ]\* 4.3 Write property test for time slot validation

    - **Property 4: Time Slot Validation and Duration Constraints**
    - **Validates: Requirements 2.3, 2.5**

  - [x] 4.4 Implement conversational booking flow logic

    - Add guided field collection logic
    - Implement booking state management
    - Create booking confirmation logic
    - _Requirements: 2.1, 2.2, 2.4_

  - [ ]\* 4.5 Write property test for booking creation
    - **Property 5: Booking Creation Completeness**
    - **Validates: Requirements 2.4, 3.1, 4.1**

- [-] 5. Google Calendar Integration

  - [x] 5.1 Implement Calendar Service with Google API

    - Install googleapis package
    - Set up service account authentication
    - Create CalendarService class with createEvent method
    - Implement availability checking logic
    - _Requirements: 3.1, 3.2_

  - [ ]\* 5.2 Write property test for calendar event creation

    - **Property 6: Calendar Event Accuracy**
    - **Validates: Requirements 3.2, 3.3, 3.4**

  - [x] 5.3 Add calendar event details and error handling

    - Implement event description with user information
    - Add proper time zone handling
    - Implement error logging and graceful failure handling
    - _Requirements: 3.3, 3.4, 3.5_

  - [ ]\* 5.4 Write unit tests for calendar error scenarios
    - Test calendar API failure handling
    - Test service account authentication
    - Test time zone conversion accuracy
    - _Requirements: 3.5_

- [x] 6. Checkpoint - Core Booking Flow Complete

  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. HubSpot CRM Integration

  - [x] 7.1 Implement Lead Manager with HubSpot API

    - Install @hubspot/api-client package
    - Create LeadManager class with contact management
    - Implement duplicate contact prevention
    - Add lead property mapping
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]\* 7.2 Write property test for HubSpot contact management

    - **Property 7: HubSpot Contact Management**
    - **Validates: Requirements 4.2, 4.3**

  - [x] 7.3 Add HubSpot error handling and retry logic

    - Implement exponential backoff retry logic
    - Add API rate limit handling
    - Implement error logging and graceful failure
    - _Requirements: 4.4, 4.5_

  - [ ]\* 7.4 Write unit tests for HubSpot error scenarios
    - Test API failure handling
    - Test duplicate contact prevention
    - Test retry logic functionality
    - _Requirements: 4.4_

- [-] 8. Voice Integration with Retell AI

  - [ ] 8.1 Implement Voice Handler service

    - Install Retell AI SDK or HTTP client
    - Create VoiceHandler class with webhook processing
    - Implement voice-to-booking flow integration
    - Add webhook signature verification
    - _Requirements: 5.1, 5.2_

  - [ ]\* 8.2 Write property test for voice-chat parity

    - **Property 8: Voice-Chat Functional Parity**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

  - [ ] 8.3 Connect voice handler to booking and integration services

    - Wire voice bookings to HubSpot lead creation
    - Wire voice bookings to calendar event creation
    - Implement voice confirmation responses
    - _Requirements: 5.3, 5.4, 5.5_

  - [ ]\* 8.4 Write unit tests for voice integration
    - Test webhook signature verification
    - Test voice booking flow completion
    - Test voice confirmation generation
    - _Requirements: 5.5_

- [ ] 9. API Routes and Endpoints

  - [ ] 9.1 Create chat API routes

    - Implement POST /api/chat endpoint
    - Connect chat route to AI service
    - Add request/response validation
    - _Requirements: 7.1_

  - [ ] 9.2 Create booking API routes

    - Implement POST /api/booking endpoint
    - Implement GET /api/booking/availability endpoint
    - Connect routes to booking service
    - _Requirements: 7.2_

  - [ ] 9.3 Create voice webhook routes

    - Implement POST /api/voice/webhook endpoint
    - Connect route to voice handler
    - Add webhook authentication
    - _Requirements: 7.3_

  - [ ] 9.4 Create health check and monitoring routes

    - Implement GET /health endpoint
    - Implement GET /api/status endpoint
    - Add basic system health checks
    - _Requirements: 8.5_

  - [ ]\* 9.5 Write unit tests for API endpoints
    - Test all endpoint responses and error cases
    - Test request validation
    - Test authentication and authorization
    - _Requirements: 7.1, 7.2, 7.3, 8.5_

- [ ] 10. Embeddable Widget Implementation

  - [ ] 10.1 Create frontend widget HTML/CSS/JavaScript

    - Build chat interface with HTML/CSS
    - Implement JavaScript for chat functionality
    - Add widget embedding script generation
    - _Requirements: 6.1, 6.2_

  - [ ] 10.2 Implement widget-backend communication

    - Add secure API communication from widget
    - Implement proper authentication for widget requests
    - Add CORS configuration for external domains
    - _Requirements: 6.3, 6.4_

  - [ ]\* 10.3 Write property test for widget security

    - **Property 9: Widget Security and Communication**
    - **Validates: Requirements 6.3, 6.4**

  - [ ]\* 10.4 Write unit tests for widget functionality
    - Test widget embedding on external sites
    - Test chat interface functionality
    - Test API communication security
    - _Requirements: 6.1, 6.2_

- [ ] 11. Configuration and Environment Management

  - [ ] 11.1 Implement comprehensive environment configuration

    - Create .env.example with all required variables
    - Add configuration validation on startup
    - Implement secure secret loading
    - _Requirements: 7.5, 8.2_

  - [ ]\* 11.2 Write property test for environment configuration

    - **Property 10: Environment-Based Configuration**
    - **Validates: Requirements 7.5, 8.2**

  - [ ] 11.3 Add logging and monitoring setup

    - Implement structured logging with winston
    - Add request logging middleware
    - Implement error tracking and monitoring
    - _Requirements: 8.3_

  - [ ]\* 11.4 Write property test for logging
    - **Property 12: Comprehensive Logging**
    - **Validates: Requirements 8.3**

- [ ] 12. Checkpoint - Integration Testing

  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Railway Deployment Configuration

  - [ ] 13.1 Create Railway deployment files

    - Create railway.json configuration
    - Set up environment variable templates
    - Configure build and start scripts
    - _Requirements: 8.1, 8.2_

  - [ ] 13.2 Add production optimizations

    - Configure production logging levels
    - Add health check endpoints for Railway
    - Implement graceful shutdown handling
    - _Requirements: 8.3, 8.4_

  - [ ]\* 13.3 Write deployment validation tests
    - Test environment variable loading
    - Test health check endpoints
    - Test production configuration
    - _Requirements: 8.1, 8.5_

- [ ] 14. Final Integration and Error Handling

  - [ ] 14.1 Wire all services together in main application

    - Connect all services through dependency injection
    - Implement circuit breaker patterns for external APIs
    - Add comprehensive error handling and recovery
    - _Requirements: All integration requirements_

  - [ ] 14.2 Add comprehensive error handling

    - Implement graceful degradation for service failures
    - Add retry logic with exponential backoff
    - Create user-friendly error responses
    - _Requirements: 3.5, 4.4_

  - [ ]\* 14.3 Write integration tests for complete booking flows
    - Test end-to-end chat booking flow
    - Test end-to-end voice booking flow
    - Test error recovery scenarios
    - _Requirements: All functional requirements_

- [ ] 15. Final Checkpoint - Production Readiness
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and user feedback
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
- All external API integrations include proper error handling and retry logic
- The implementation follows Node.js best practices with Express.js framework
