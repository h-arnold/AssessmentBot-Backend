```mermaid
classDiagram
    %% Root Application Module
    class AppModule

    %% Feature Modules
    class AssessorModule
    class AuthModule
    class ConfigModule
    class SwaggerModule
    class LoggerModule
    class ThrottlerModule
    class CommonModule
    class LLMModule

    %% Assessor Components
    class AssessorController
    class AssessorService
    class CreateAssessorDto

    %% Auth Components
    class ApiKeyStrategy
    class ApiKeyGuard

    %% Common Utilities
    class HttpExceptionFilter
    class ZodValidationPipe
    class JsonParserUtil

    %% Prompt Hierarchy
    class Prompt
    class TextPrompt
    class TablePrompt
    class ImagePrompt

    %% LLM Service Hierarchy
    class LLMService
    class GeminiService

    %% Module Relationships
    AppModule <|-- AssessorModule
    AppModule <|-- AuthModule
    AppModule <|-- ConfigModule
    AppModule <|-- SwaggerModule
    AppModule <|-- LoggerModule
    AppModule <|-- ThrottlerModule
    AppModule <|-- CommonModule
    AppModule <|-- LLMModule

    %% Assessor Relationships
    AssessorModule --> AssessorController
    AssessorModule --> AssessorService
    AssessorController --> CreateAssessorDto
    AssessorController --> AssessorService

    %% Auth Relationships
    AuthModule --> ApiKeyStrategy
    AuthModule --> ApiKeyGuard

    %% Common Module Relationships
    CommonModule --> HttpExceptionFilter
    CommonModule --> ZodValidationPipe
    CommonModule --> JsonParserUtil

    %% LLM Module Relationships
    LLMModule --> LLMService

    %% Prompt Inheritance
    Prompt <|-- TextPrompt
    Prompt <|-- TablePrompt
    Prompt <|-- ImagePrompt

    %% LLM Service Inheritance
    LLMService <|-- OpenAIService

    %% Service Integration
    AssessorService --> LLMService
    AssessorService --> JsonParserUtil

    %% Usage Relationships
    AssessorController --> ZodValidationPipe
    AssessorController --> ApiKeyGuard
    AssessorService --> Prompt
```
