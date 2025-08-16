# Google Sheets Integration Tests

This directory contains comprehensive tests for the Google Sheets integration feature.

## Test Structure

```
tests/
├── integration/           # Integration tests
│   ├── form-submission.test.ts
│   └── google-sheets-error-scenarios.test.ts
├── unit/                 # Unit tests
│   ├── data-formatter.test.ts
│   └── google-sheets-service.test.ts
└── README.md
```

## Test Categories

### Unit Tests

#### Data Formatter Tests (`tests/unit/data-formatter.test.ts`)
- Tests the `formatFormDataForSubmission` function
- Tests the `validateFormDataForSubmission` function  
- Tests the `convertToSpreadsheetRow` function
- Covers various data formats, edge cases, and validation scenarios

#### Google Sheets Service Tests (`tests/unit/google-sheets-service.test.ts`)
- Tests service factory functions
- Tests environment variable configuration
- Tests error handling for missing configuration
- Uses mocked dependencies to isolate unit behavior

### Integration Tests

#### Form Submission Tests (`tests/integration/form-submission.test.ts`)
- End-to-end tests for the complete form submission flow
- Tests various form data combinations and formats
- Tests data validation and sanitization
- Tests HTTP method validation
- Tests error handling scenarios

#### Error Scenarios Tests (`tests/integration/google-sheets-error-scenarios.test.ts`)
- Tests missing environment variables
- Tests Google Sheets API errors (authentication, rate limiting, network issues)
- Tests connection validation failures
- Tests unexpected errors and edge cases
- Tests graceful error handling (always returns success to user)

## Running Tests

### Run All Tests
```bash
npm run test:run tests/
```

### Run Specific Test Categories
```bash
# Unit tests only
npm run test:run tests/unit/

# Integration tests only
npm run test:run tests/integration/

# Specific test file
npm run test:run tests/unit/data-formatter.test.ts
```

### Run Tests in Watch Mode
```bash
npm run test tests/
```

### Run Tests with UI
```bash
npm run test:ui
```

## Test Coverage

The tests cover the following requirements from the specification:

### Requirement 3.1 & 3.3 (Environment Variables & Configuration)
- ✅ Tests environment variable validation
- ✅ Tests service account authentication setup
- ✅ Tests missing configuration handling

### Requirement 5.5 (Testing Strategy)
- ✅ Unit tests for data formatting and validation
- ✅ Integration tests for complete submission flow
- ✅ Error scenario testing
- ✅ Edge case testing

### Additional Coverage
- ✅ Form data validation (all required fields)
- ✅ Data sanitization and formatting
- ✅ HTTP method validation
- ✅ Error handling (graceful failures)
- ✅ Various form data combinations
- ✅ Special characters and edge cases

## Test Data

The tests use realistic test data including:

- **Names**: Various formats and lengths
- **Email addresses**: Valid and invalid formats
- **Phone numbers**: Multiple formats (US, international)
- **Social platforms**: Instagram, TikTok, YouTube, LinkedIn, etc.
- **Contact methods**: Email, phone, combinations
- **Edge cases**: Empty values, whitespace, special characters

## Mocking Strategy

### Unit Tests
- Mock external dependencies (googleapis, logger, error handler)
- Focus on testing individual function behavior
- Isolate units from external services

### Integration Tests
- Mock Google Sheets service to control responses
- Test actual API handler behavior
- Verify end-to-end request/response flow

## Error Testing

The tests verify that the system:

1. **Always returns success to users** (per requirements)
2. **Logs errors for debugging** without exposing them to users
3. **Handles missing environment variables** gracefully
4. **Handles API failures** (authentication, network, rate limits)
5. **Validates and sanitizes input data** properly
6. **Maintains user experience** during failures

## Test Environment Setup

The tests automatically:
- Set up required environment variables for each test
- Clean up environment variables after each test
- Mock external services to avoid real API calls
- Use deterministic test data for consistent results

## Debugging Tests

### View Test Output
```bash
npm run test:run tests/ -- --reporter=verbose
```

### Debug Specific Test
```bash
npm run test:run tests/unit/data-formatter.test.ts -- --reporter=verbose
```

### Check Test Coverage
```bash
npm run test:run tests/ -- --coverage
```

## Adding New Tests

When adding new tests:

1. **Follow the existing structure** (unit vs integration)
2. **Use descriptive test names** that explain the scenario
3. **Include both positive and negative test cases**
4. **Mock external dependencies** appropriately
5. **Clean up after tests** (environment variables, mocks)
6. **Test error scenarios** to ensure graceful handling

### Example Test Structure
```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup test environment
  });

  afterEach(() => {
    // Clean up after test
  });

  describe('Happy Path', () => {
    it('should handle valid input correctly', () => {
      // Test implementation
    });
  });

  describe('Error Cases', () => {
    it('should handle invalid input gracefully', () => {
      // Test implementation
    });
  });
});
```

## Continuous Integration

These tests are designed to run in CI/CD environments:
- No external dependencies (all mocked)
- Deterministic results
- Fast execution
- Clear error messages
- Proper exit codes

## Troubleshooting

### Common Issues

1. **Mock not working**: Ensure mocks are defined before imports
2. **Environment variables**: Check setup/cleanup in beforeEach/afterEach
3. **Async tests**: Use proper async/await patterns
4. **Type errors**: Ensure proper TypeScript types for test data

### Getting Help

- Check the test output for specific error messages
- Review the existing test patterns for similar scenarios
- Ensure all dependencies are properly mocked
- Verify test data matches expected formats