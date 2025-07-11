/**
 * Verifies the `/v1/assessor` endpoint by performing a series of tests:
 *
 * 1. **Valid Payload, Valid API Key**: Sends a POST request with a valid JSON payload and a valid API key.
 *    - Asserts that the response status is `201 Created`.
 *
 * 2. **Invalid Payload**: Sends a POST request with an invalid JSON payload.
 *    - Asserts that the response status is `400 Bad Request`.
 *
 * 3. **No API Key**: Sends a POST request without an `Authorization` header.
 *    - Asserts that the response status is `401 Unauthorized`.
 *
 * The function outputs the results of each test to the console and exits the process with a non-zero status code
 * if any test fails.
 *
 * @async
 * @function verifyAssessorEndpoint
 * @returns {Promise<void>} Resolves when all tests are completed.
 * @throws Exits the process with a status code of `1` if any test fails.
 */
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000'; // Assuming default NestJS port
const VALID_API_KEY = process.env.API_KEYS
  ? process.env.API_KEYS.split(',')[0]
  : 'test-api-key'; // Use the first API key if available, otherwise a default

const delay = (ms: number): Promise<void> =>
  new Promise((res) => setTimeout(res, ms));

async function verifyAssessorEndpoint(): Promise<void> {
  let allTestsPassed = true;
  process.stdout.write('Starting Assessor Endpoint Verification...\n');

  await delay(5000); // Wait 5 seconds for the server to start

  // Test 1: Send a POST to /v1/assessor with a valid JSON payload and valid API key, asserts 201 Created
  try {
    const validPayload = {
      taskType: 'TEXT',
      reference: 'valid reference',
      template: 'valid template',
      studentResponse: 'valid student response',
    };
    const response = await axios.post(
      `${API_BASE_URL}/v1/assessor`,
      validPayload,
      {
        headers: {
          Authorization: `Bearer ${VALID_API_KEY}`,
        },
      },
    );
    if (response.status === 201) {
      process.stdout.write(
        `Test 1 (Valid Payload, Valid API Key): PASSED (${response.status})\n`,
      );
    } else {
      throw new Error(`Expected 201, got ${response.status}`);
    }
  } catch (error) {
    allTestsPassed = false;
    if (axios.isAxiosError(error)) {
      process.stderr.write(
        `Test 1 (Valid Payload, Valid API Key): FAILED\nStatus: ${error.response?.status}\nData: ${JSON.stringify(error.response?.data)}\n`,
      );
    } else {
      process.stderr.write(
        `Test 1 (Valid Payload, Valid API Key): FAILED\n${error}\n`,
      );
    }
  }

  // Test 2: Sends a POST to /v1/assessor with an invalid payload, asserts 400 Bad Request
  try {
    const invalidPayload = {
      taskType: 'INVALID',
      reference: '',
      template: 'test',
      studentResponse: 'test',
    };
    await axios.post(`${API_BASE_URL}/v1/assessor`, invalidPayload, {
      headers: {
        Authorization: `Bearer ${VALID_API_KEY}`,
      },
    });
    allTestsPassed = false;
    process.stderr.write(
      'Test 2 (Invalid Payload): FAILED (Expected 400, but got success)\n',
    );
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 400) {
      process.stdout.write(
        `Test 2 (Invalid Payload): PASSED (${error.response.status})\n`,
      );
    } else {
      allTestsPassed = false;
      if (axios.isAxiosError(error)) {
        process.stderr.write(
          `Test 2 (Invalid Payload): FAILED\nStatus: ${error.response?.status}\nData: ${JSON.stringify(error.response?.data)}\n`,
        );
      } else {
        process.stderr.write(`Test 2 (Invalid Payload): FAILED\n${error}\n`);
      }
    }
  }

  // Test 3: Sends a POST to /v1/assessor without an Authorization header, asserts 401 Unauthorized
  try {
    const payload = {
      taskType: 'TEXT',
      reference: 'test',
      template: 'test',
      studentResponse: 'test',
    };
    await axios.post(`${API_BASE_URL}/v1/assessor`, payload);
    allTestsPassed = false;
    process.stderr.write(
      'Test 3 (No API Key): FAILED (Expected 401, but got success)\n',
    );
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      process.stdout.write(
        `Test 3 (No API Key): PASSED (${error.response.status})\n`,
      );
    } else {
      allTestsPassed = false;
      if (axios.isAxiosError(error)) {
        process.stderr.write(
          `Test 3 (No API Key): FAILED\nStatus: ${error.response?.status}\nData: ${JSON.stringify(error.response?.data)}\n`,
        );
      } else {
        process.stderr.write(`Test 3 (No API Key): FAILED\n${error}\n`);
      }
    }
  }

  process.stdout.write('Assessor Endpoint Verification Complete.\n');

  if (!allTestsPassed) {
    process.stderr.write('One or more verification tests failed.\n');
    process.exit(1);
  }
}

verifyAssessorEndpoint();
