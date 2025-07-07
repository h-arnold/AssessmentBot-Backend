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
    class OpenAIService
    class AnthropicService

    %% Module Relationships
    AppModule <|-- AssessorModule
    AppModule <|-- AuthModule
    AppModule <|-- ConfigModule
    AppModule <|-- SwaggerModule
    AppModule <|-- LoggerModule

    %% Assessor Relationships
    AssessorModule --> AssessorController
    AssessorModule --> AssessorService
    AssessorController --> CreateAssessorDto
    AssessorController --> AssessorService

    %% Auth Relationships
    AuthModule --> ApiKeyStrategy
    AuthModule --> ApiKeyGuard

    %% Common Utility Usage
    LoggerModule --> HttpExceptionFilter
    LoggerModule --> ZodValidationPipe
    LoggerModule --> JsonParserUtil

    %% Prompt Inheritance
    Prompt <|-- TextPrompt
    Prompt <|-- TablePrompt
    Prompt <|-- ImagePrompt

    %% LLM Service Inheritance
    LLMService <|-- OpenAIService
    LLMService <|-- AnthropicService

    %% Service Integration
    AssessorService --> LLMService
```