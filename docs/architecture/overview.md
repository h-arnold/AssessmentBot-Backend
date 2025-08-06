# Architecture Overview

This document provides a comprehensive overview of the AssessmentBot-Backend architecture, a NestJS-based API service that leverages Large Language Models (LLMs) to provide automated assessment services for educational content.

## High-Level Architecture

```mermaid
graph TB
    subgraph "External Clients"
        C[API Clients]
    end

    subgraph "AssessmentBot Backend"
        subgraph "API Layer"
            GW[API Gateway/NestJS]
            AUTH[Authentication Guard]
            THROTTLE[Rate Limiting]
        end

        subgraph "Business Logic Layer"
            AC[Assessor Controller]
            AS[Assessor Service]
            SC[Status Controller]
        end

        subgraph "Prompt Generation Layer"
            PF[Prompt Factory]
            TP[Text Prompt]
            IP[Image Prompt]
            TAP[Table Prompt]
        end

        subgraph "LLM Integration Layer"
            LLMS[LLM Service Interface]
            GS[Gemini Service]
        end

        subgraph "Cross-Cutting Concerns"
            CONFIG[Config Service]
            LOG[Logging Service]
            VALID[Validation Pipes]
        end
    end

    subgraph "External Services"
        GEMINI[Google Gemini API]
    end

    C --> GW
    GW --> AUTH
    AUTH --> THROTTLE
    THROTTLE --> AC
    THROTTLE --> SC
    AC --> AS
    AS --> PF
    PF --> TP
    PF --> IP
    PF --> TAP
    AS --> LLMS
    LLMS --> GS
    GS --> GEMINI

    CONFIG -.-> AS
    CONFIG -.-> GS
    LOG -.-> AS
    LOG -.-> GS
    VALID -.-> AC
```

### Key Components and Responsibilities

| Component                | Responsibility                                               |
| ------------------------ | ------------------------------------------------------------ |
| **API Gateway**          | Request routing, middleware orchestration, and HTTP handling |
| **Authentication Guard** | API key validation and authorisation                         |
| **Rate Limiting**        | Request throttling for abuse prevention                      |
| **Assessor Service**     | Core business logic orchestration                            |
| **Prompt Factory**       | Task-specific prompt generation                              |
| **LLM Service**          | Abstract interface for LLM providers                         |
| **Gemini Service**       | Google Gemini API integration                                |
| **Config Service**       | Environment configuration management                         |

## External Dependencies

The system integrates with the following external services:

- **Google Gemini API**: Primary LLM provider for content assessment
- **Environment Configuration**: File-based and environment variable configuration
- **HTTP Clients**: For external API communication

## Module Architecture

The application follows NestJS module architecture with clear separation of concerns:

```mermaid
graph LR
    subgraph "Core Modules"
        APP[App Module]
        CONFIG[Config Module]
        COMMON[Common Module]
    end

    subgraph "Feature Modules"
        ASSESSOR[Assessor Module v1]
        AUTH[Auth Module]
        STATUS[Status Module]
    end

    subgraph "Integration Modules"
        LLM[LLM Module]
        PROMPT[Prompt Module]
    end

    APP --> CONFIG
    APP --> COMMON
    APP --> ASSESSOR
    APP --> AUTH
    APP --> STATUS

    ASSESSOR --> LLM
    ASSESSOR --> PROMPT
    ASSESSOR --> AUTH

    LLM --> CONFIG
    PROMPT --> CONFIG
    AUTH --> CONFIG
```

### Dependency Injection Patterns

The system uses NestJS's built-in dependency injection container with the following patterns:

- **Constructor Injection**: Primary pattern for service dependencies
- **Provider Registration**: Services registered in module `providers` arrays
- **Interface Segregation**: Abstract base classes for LLM services
- **Factory Pattern**: Used for prompt creation based on task types

## Design Principles

### SOLID Principles Implementation

- **Single Responsibility**: Each service has a focused, single purpose
- **Open/Closed**: LLM service abstraction allows new providers without modification
- **Liskov Substitution**: All prompt types can be used interchangeably
- **Interface Segregation**: Clean abstractions between layers
- **Dependency Inversion**: Depends on abstractions, not concrete implementations

### Security-First Approach

- **API Key Authentication**: Mandatory authentication for all assessment endpoints
- **Input Validation**: Zod schema validation for all inputs
- **Rate Limiting**: Global and endpoint-specific throttling
- **Environment Isolation**: Strict environment variable validation
- **Stateless Design**: No server-side session storage

### Separation of Concerns

- **Controller Layer**: HTTP request/response handling only
- **Service Layer**: Business logic implementation
- **Integration Layer**: External service communication
- **Validation Layer**: Input sanitisation and validation

## Technology Stack

### Runtime and Framework

- **Node.js (22-alpine)**: JavaScript runtime environment
- **NestJS**: Progressive Node.js framework for building scalable applications
- **TypeScript**: Strongly typed programming language
- **Express.js**: Underlying HTTP server framework

### Validation and Configuration

- **Zod**: TypeScript-first schema validation library
- **dotenv**: Environment variable loading
- **Custom ConfigService**: Centralised configuration management

### Authentication and Security

- **Passport.js**: Authentication middleware
- **passport-http-bearer**: Bearer token strategy for API keys
- **Throttler**: Rate limiting middleware

### LLM Integration

- **@google/generative-ai**: Google Gemini API client
- **json-repair**: Robust JSON parsing for LLM responses
- **Mustache**: Template engine for prompt generation

### Testing and Development

- **Jest**: Testing framework
- **SuperTest**: HTTP assertion library for E2E tests
- **ESLint**: Code linting and style enforcement
- **Prettier**: Code formatting

### Observability

- **nestjs-pino**: Structured logging with Pino
- **pino-pretty**: Development log formatting

## Scalability Considerations

### Stateless Design

The application is completely stateless, enabling:

- Horizontal scaling across multiple instances
- Load balancing without session affinity
- Container-based deployment strategies

### Performance Optimisation

- **Connection Pooling**: HTTP clients maintain connection pools
- **Rate Limiting**: Prevents resource exhaustion
- **Lazy Loading**: Modules and services loaded on-demand
- **Efficient Validation**: Zod schema validation with early exit

### Bottleneck Identification

Primary performance bottlenecks:

1. **LLM API Calls**: Network latency and processing time
2. **Image Processing**: Large file validation and processing
3. **JSON Parsing**: LLM response parsing and validation

### Deployment Architecture

The system is designed for containerised deployment:

- **Docker Support**: Multi-stage Docker builds
- **Environment Isolation**: Configuration via environment variables
- **Health Checks**: Built-in status endpoints for monitoring
- **Graceful Shutdown**: Proper resource cleanup on termination

---

_For detailed class relationships, see the [Class Structure](../design/ClassStructure.md) diagram._
