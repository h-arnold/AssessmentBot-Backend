import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000'; // Assuming default NestJS port
const VALID_API_KEY = process.env.API_KEYS ? process.env.API_KEYS.split(',')[0] : 'test-api-key'; // Use the first API key if available, otherwise a default

async function verifyAssessorEndpoint() {
  console.log('Starting Assessor Endpoint Verification...');

  // Test 1: Send a POST to /v1/assessor with a valid JSON payload and valid API key, asserts 201 Created
  try {
    const validPayload = {
      taskType: 'TEXT',
      reference: 'valid reference',
      template: 'valid template',
      studentResponse: 'valid student response',
    };
    const response = await axios.post(`${API_BASE_URL}/v1/assessor`, validPayload, {
      headers: {
        Authorization: `Bearer ${VALID_API_KEY}`,
      },
    });
    console.log('Test 1 (Valid Payload, Valid API Key): PASSED', response.status);
  } catch (error) {
    console.error('Test 1 (Valid Payload, Valid API Key): FAILED', error.response?.status, error.message);
  }

  // Test 2: Sends a POST to /v1/assessor with an invalid payload, asserts 400 Bad Request
  try {
    const invalidPayload = {
      taskType: 'INVALID',
      reference: '',
      template: 'test',
      studentResponse: 'test',
    };
    const response = await axios.post(`${API_BASE_URL}/v1/assessor`, invalidPayload, {
      headers: {
        Authorization: `Bearer ${VALID_API_KEY}`,
      },
    });
    console.log('Test 2 (Invalid Payload): FAILED (Expected 400, got', response.status);
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('Test 2 (Invalid Payload): PASSED', error.response.status);
    } else {
      console.error('Test 2 (Invalid Payload): FAILED', error.response?.status, error.message);
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
    const response = await axios.post(`${API_BASE_URL}/v1/assessor`, payload);
    console.log('Test 3 (No API Key): FAILED (Expected 401, got', response.status);
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('Test 3 (No API Key): PASSED', error.response.status);
    } else {
      console.error('Test 3 (No API Key): FAILED', error.response?.status, error.message);
    }
  }

  console.log('Assessor Endpoint Verification Complete.');
}

verifyAssessorEndpoint();