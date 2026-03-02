// src/api/webauthn.js
import api from "./axiosClient";
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

/**
 * Register a new device/authenticator
 */
export async function registerDevice() {
  try {
    // 1. Get options from server
    const resp = await api.post("/webauthn/register/options");
    const options = resp.data;

    // 2. Browser handles WebAuthn ceremony
    const attResp = await startRegistration(options);

    // 3. Send response to server for verification
    const verificationResp = await api.post("/webauthn/register/verify", attResp);

    return verificationResp.data; // { status: 'success', credential_id: ... }
  } catch (error) {
    if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
    }
    throw error;
  }
}

/**
 * Authenticate using registered device
 * @returns {Promise<object>} The authentication credential to send with attendance payload
 */
export async function authenticateDevice() {
  try {
    // 1. Get options
    const resp = await api.post("/webauthn/authenticate/options");
    const options = resp.data;

    // 2. Browser ceremony
    const authResp = await startAuthentication(options);
    
    // 3. Return credential to be sent to final endpoint
    return authResp;
  } catch (error) {
     if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
    }
    throw error;
  }
}
