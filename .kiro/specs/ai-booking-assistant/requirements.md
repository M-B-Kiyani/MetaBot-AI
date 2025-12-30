# Requirements Document

## Introduction

The AI-powered Chat and Voice Booking Assistant is a comprehensive system that enables users to interact with an AI assistant to get company information, book services, and manage leads. The system integrates with multiple third-party services including Gemini AI, HubSpot CRM, Google Calendar, and Retell voice services, while providing an embeddable widget for external websites.

## Glossary

- **AI_Assistant**: The core AI system powered by Gemini API that handles user conversations
- **Booking_System**: The component responsible for managing service bookings and calendar integration
- **Lead_Manager**: The component that handles HubSpot CRM integration for lead storage
- **Voice_Handler**: The Retell-powered voice interaction system
- **Widget**: The embeddable frontend component for external websites
- **Calendar_Service**: Google Calendar integration service using service account authentication
- **Backend_API**: The Node.js server providing all API endpoints

## Requirements

### Requirement 1: AI Conversation Management

**User Story:** As a website visitor, I want to ask questions about Metalogics.io services, so that I can get accurate company information.

#### Acceptance Criteria

1. WHEN a user sends a message to the chat endpoint, THE AI_Assistant SHALL generate responses using the Gemini API
2. WHEN generating responses, THE AI_Assistant SHALL restrict answers to Metalogics.io-related knowledge only
3. WHEN the AI_Assistant cannot answer a question within company scope, THE AI_Assistant SHALL provide a graceful fallback response
4. WHEN processing user input, THE Backend_API SHALL validate and sanitize all inputs to prevent injection attacks
5. THE AI_Assistant SHALL prevent hallucinations by maintaining strict context boundaries

### Requirement 2: Conversational Booking Flow

**User Story:** As a potential client, I want to book a service meeting through natural conversation, so that I can schedule consultations easily.

#### Acceptance Criteria

1. WHEN a user initiates booking, THE Booking_System SHALL collect name, email, company, inquiry, preferred time slot, and meeting duration
2. WHEN collecting booking information, THE Booking_System SHALL guide users conversationally through each required field
3. WHEN a user provides a time slot, THE Booking_System SHALL validate availability before confirming
4. WHEN all required information is collected, THE Booking_System SHALL create a booking record
5. THE Booking_System SHALL support meeting durations of 15, 30, 45, and 60 minutes only

### Requirement 3: Google Calendar Integration

**User Story:** As a service provider, I want bookings to automatically appear in my Google Calendar, so that I can manage my schedule effectively.

#### Acceptance Criteria

1. WHEN a booking is confirmed, THE Calendar_Service SHALL create an event in the company Google Calendar
2. WHEN creating calendar events, THE Calendar_Service SHALL use Google Service Account authentication
3. WHEN setting event details, THE Calendar_Service SHALL include user information in the event description
4. WHEN creating events, THE Calendar_Service SHALL set the correct start time and duration based on booking details
5. IF calendar creation fails, THEN THE Calendar_Service SHALL log the error and continue with booking confirmation

### Requirement 4: HubSpot CRM Lead Management

**User Story:** As a sales team member, I want all booking inquiries stored in HubSpot, so that I can track and follow up with leads.

#### Acceptance Criteria

1. WHEN a booking is completed, THE Lead_Manager SHALL create or update a contact in HubSpot
2. WHEN creating HubSpot contacts, THE Lead_Manager SHALL prevent duplicate entries by checking existing contacts
3. WHEN storing lead information, THE Lead_Manager SHALL include all booking details as lead properties
4. IF HubSpot API fails, THEN THE Lead_Manager SHALL log the error and continue with booking flow
5. THE Lead_Manager SHALL handle API rate limits gracefully

### Requirement 5: Voice Interaction System

**User Story:** As a user, I want to interact with the booking system via voice, so that I can book services hands-free.

#### Acceptance Criteria

1. WHEN voice interaction is initiated, THE Voice_Handler SHALL use Retell API for voice processing
2. WHEN processing voice commands, THE Voice_Handler SHALL mirror all chat booking functionality
3. WHEN voice booking is completed, THE Voice_Handler SHALL trigger HubSpot lead creation
4. WHEN voice booking is completed, THE Voice_Handler SHALL trigger Google Calendar event creation
5. THE Voice_Handler SHALL provide voice confirmation of successful bookings

### Requirement 6: Embeddable Widget System

**User Story:** As a website owner, I want to embed the chat assistant on my website, so that visitors can access booking services.

#### Acceptance Criteria

1. THE Widget SHALL be embeddable via a single script tag on any external website
2. WHEN embedded, THE Widget SHALL provide a complete chat interface for user interactions
3. WHEN communicating with backend, THE Widget SHALL use secure API calls with proper authentication
4. THE Backend_API SHALL handle CORS requests from external domains appropriately
5. THE Widget SHALL work across different browsers and devices

### Requirement 7: Backend API Architecture

**User Story:** As a system administrator, I want a robust backend API, so that all integrations work reliably in production.

#### Acceptance Criteria

1. THE Backend_API SHALL implement a /chat endpoint for AI conversations
2. THE Backend_API SHALL implement booking endpoints for service scheduling
3. THE Backend_API SHALL implement voice webhook endpoints for Retell integration
4. WHEN processing requests, THE Backend_API SHALL validate all inputs and handle errors gracefully
5. THE Backend_API SHALL load all configuration from environment variables without hard-coded secrets

### Requirement 8: Production Deployment

**User Story:** As a DevOps engineer, I want the system deployed on Railway with production-safe configuration, so that it runs reliably.

#### Acceptance Criteria

1. THE Backend_API SHALL be deployable on Railway platform
2. WHEN deployed, THE Backend_API SHALL use environment variables for all sensitive configuration
3. THE Backend_API SHALL implement proper logging for monitoring and debugging
4. THE Backend_API SHALL handle production-level traffic and error scenarios
5. THE Backend_API SHALL implement health check endpoints for monitoring

### Requirement 9: Security and Data Protection

**User Story:** As a security officer, I want all user data protected and API endpoints secured, so that the system meets security standards.

#### Acceptance Criteria

1. THE Backend_API SHALL validate and sanitize all user inputs to prevent injection attacks
2. THE Backend_API SHALL implement rate limiting to prevent abuse
3. WHEN storing user data, THE Backend_API SHALL follow data protection best practices
4. THE Backend_API SHALL use HTTPS for all external communications
5. THE Backend_API SHALL never expose API keys or secrets in responses or logs
