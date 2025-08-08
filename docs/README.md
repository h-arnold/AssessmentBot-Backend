# AssessmentBot-Backend Documentation

Welcome to the comprehensive documentation for the AssessmentBot-Backend project. This documentation provides detailed information about the architecture, development, deployment, and usage of the assessment system.

## Table of Contents

### 📚 Getting Started

- [Project Overview](../README.md) - Main project README with setup instructions
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute to the project
- [Development Environment](copilot-environment.md) - GitHub Copilot and development setup
- [Dev Container Setup](../.devcontainer/README.md) - VS Code dev container configuration

### 🔧 Development

- [Development Workflow](development/workflow.md) - Local development practices and procedures
- [Debugging Guide](development/debugging.md) - Debugging techniques and tools
- [Code Style Guide](development/code-style.md) - Coding standards and conventions
- [Git Workflow](development/git-workflow.md) - Branching strategy and commit conventions

### 🏗️ Architecture & Design

- [Architecture Overview](architecture/overview.md) - _[TODO]_ High-level system architecture
- [Class Structure](design/ClassStructure.md) - Visual representation of class relationships
- [Module Responsibilities](architecture/modules.md) - _[TODO]_ Detailed module breakdown
- [Data Flow](architecture/data-flow.md) - _[TODO]_ Request/response flow through the system
- [Design Patterns](architecture/patterns.md) - _[TODO]_ Design patterns used in the codebase

### 🔌 API Documentation

- [API Reference](api/API_Documentation.md) - Complete API endpoint documentation
- [Authentication](auth/API_Key_Management.md) - API key management and authentication
- [Request/Response Schemas](api/schemas.md) - Detailed data schemas
- [Error Codes](api/error-codes.md) - API error handling and codes
- [Rate Limiting](api/rate-limiting.md) - API rate limiting details

### ⚙️ Configuration

- [Environment Variables](configuration/environment.md) - _[TODO]_ Complete environment configuration guide
- [Application Settings](configuration/settings.md) - _[TODO]_ Application configuration options
- [Security Configuration](configuration/security.md) - _[TODO]_ Security-related configuration
- [LLM Configuration](configuration/llm.md) - _[TODO]_ Large Language Model setup and configuration

### 🧪 Testing

- [Testing Guide](testing/README.md) - The central hub for all testing information.
- [Practical Testing Guide](testing/PRACTICAL_GUIDE.md) - Code examples for unit tests, mocking, and data management.
- [E2E Testing Guide](testing/E2E_GUIDE.md) - Specific instructions for running and creating E2E tests.

### 🚀 Deployment

- [Docker Deployment](deployment/docker.md) - _[TODO]_ Containerised deployment guide
- [Production Setup](deployment/production.md) - _[TODO]_ Production environment configuration
- [CI/CD Pipeline](deployment/cicd.md) - _[TODO]_ Continuous integration and deployment
- [Monitoring & Observability](deployment/monitoring.md) - _[TODO]_ Application monitoring setup

### 🔒 Security

- [Security Overview](security/overview.md) - _[TODO]_ Security architecture and principles
- [Authentication & Authorisation](security/auth.md) - _[TODO]_ Security implementation details
- [Input Validation](security/validation.md) - _[TODO]_ Input sanitisation and validation
- [Security Testing](security/testing.md) - _[TODO]_ Security testing procedures

### 🤖 LLM Integration

- [LLM Service Architecture](llm/architecture.md) - _[TODO]_ LLM integration architecture
- [Adding New LLM Providers](llm/providers.md) - _[TODO]_ How to add support for new LLM providers
- [Gemini Integration](llm/gemini.md) - _[TODO]_ Google Gemini specific implementation
- [Error Handling](llm/error-handling.md) - _[TODO]_ LLM error handling and retry logic
- [Performance Optimisation](llm/performance.md) - _[TODO]_ LLM performance considerations

### 📝 Prompt System

- [Prompt System Documentation](prompts/README.md) - Consolidated documentation on the prompt system architecture, usage, and extension.

### 📦 Module Documentation

#### Core Modules

- [App Module](modules/app.md) - Main application module
- [Config Module](modules/config.md) - Configuration management
- [Common Module](modules/common.md) - Shared utilities and components

#### Feature Modules

- [Assessor Module (v1)](modules/assessor.md) - Core assessment functionality
- [Authentication Module](modules/auth.md) - Authentication and security
- [LLM Module](modules/llm.md) - Large Language Model integration
- [Prompt Module](modules/prompt.md) - Prompt generation and management
- [Status Module](modules/status.md) - Health checks and system status

#### Utilities & Components

- [Validation Pipes](modules/pipes.md) - _[TODO]_ Input validation and transformation
- [Exception Filters](modules/filters.md) - _[TODO]_ Error handling and filtering
- [Guards](modules/guards.md) - _[TODO]_ Route protection and authentication
- [Utilities](modules/utilities.md) - _[TODO]_ Shared utility functions

### 🛠️ Troubleshooting

- [Common Issues](troubleshooting/common-issues.md) - _[TODO]_ Frequently encountered problems
- [Error Diagnosis](troubleshooting/diagnosis.md) - _[TODO]_ How to diagnose system issues
- [Performance Issues](troubleshooting/performance.md) - _[TODO]_ Performance debugging
- [LLM Issues](troubleshooting/llm.md) - _[TODO]_ LLM-specific troubleshooting

### 📋 Reference

- [Glossary](reference/glossary.md) - _[TODO]_ Terms and definitions
- [FAQ](reference/faq.md) - _[TODO]_ Frequently asked questions
- [Changelog](reference/changelog.md) - _[TODO]_ Version history and changes
- [Migration Guides](reference/migrations.md) - _[TODO]_ Version migration instructions

## Documentation Standards

All documentation in this project follows these standards:

- **British English**: All documentation uses British English spellings (e.g., "colour", "centre", "authorise")
- **Markdown Format**: Documentation is written in Markdown for consistency and readability
- **Code Examples**: Include practical code examples where appropriate
- **Up-to-date**: Documentation is kept current with code changes
- **Clear Structure**: Use clear headings, bullet points, and formatting for readability

## Contributing to Documentation

When contributing to documentation:

1. Follow the existing structure and naming conventions
2. Use British English throughout
3. Include code examples and practical guidance
4. Update this contents page when adding new documentation
5. Ensure links are working and up-to-date
6. Follow the project's contributing guidelines

## Getting Help

If you can't find what you're looking for in the documentation:

1. Check the [FAQ](reference/faq.md) for common questions
2. Review the [Troubleshooting](troubleshooting/common-issues.md) section
3. Search through existing [GitHub Issues](https://github.com/h-arnold/AssessmentBot-Backend/issues)
4. Create a new issue with the `documentation` label if information is missing

---

_Last updated: January 2025_
