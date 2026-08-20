import {
  SupportedLanguage,
  ReviewRequest,
  ReviewResult,
} from '../types/dashboard';

export const defaultCodeSnippets: Record<SupportedLanguage, string> = {
  typescript: `// TypeScript Sample Code - Security Review
import { jwt } from 'jsonwebtoken';

export function authenticateUser(token: string) {
  // CRITICAL: Hardcoded JWT secret fallback credential
  const secret = process.env.SECRET_KEY || "super-secret-key-12345";
  return jwt.verify(token, secret);
}

export function evalUserInput(input: string) {
  // HIGH: Dynamic code execution via eval()
  return eval(input);
}`,
  javascript: `// JavaScript Sample Code - Security Review
function handleUserQuery(req, res) {
  // HIGH: Direct SQL query string concatenation
  const email = req.body.email;
  const sql = "SELECT * FROM users WHERE email = '" + email + "'";
  db.query(sql, (err, result) => {
    res.json(result);
  });
}

function processHTML(userInput) {
  // MEDIUM: Dangerous innerHTML injection
  document.getElementById("output").innerHTML = userInput;
}`,
  python: `# Python Sample Code - Security Review
import subprocess

def run_user_script(user_input):
    # CRITICAL: Shell command injection vulnerability
    command = f"echo {user_input}"
    subprocess.call(command, shell=True)

def insecure_yaml_load(yaml_data):
    # HIGH: Unsafe YAML deserialization
    import yaml
    return yaml.load(yaml_data)
`,
  java: `// Java Sample Code - Security Review
public class UserAuth {
    public boolean checkPassword(String input, String hash) throws Exception {
        // MEDIUM: Weak cryptographic hashing algorithm
        MessageDigest md = MessageDigest.getInstance("MD5");
        byte[] digest = md.digest(input.getBytes());
        return digest.toString().equals(hash);
    }
}
`,
  cpp: `// C++ Sample Code - Security Review
#include <iostream>
#include <cstring>

void processBuffer(const char* input) {
    // CRITICAL: Buffer overflow vulnerability via unsafe strcpy
    char buffer[64];
    strcpy(buffer, input);
    std::cout << "Processed: " << buffer << std::endl;
}
`,
  go: `// Go Sample Code - Security Review
package main

import "net/http"

func handleRequest(w http.ResponseWriter, r *http.Request) {
    // LOW: Wildcard CORS access control header
    w.Header().Set("Access-Control-Allow-Origin", "*")
    w.Write([]byte("Hello, CodeSentinel"))
}
`,
};

/**
 * Service Abstraction Layer connecting the browser to Next.js server API endpoint (/api/review).
 * The server securely accesses GEMINI_API_KEY without exposing secrets to the browser client.
 */
export async function analyzeCode(request: ReviewRequest): Promise<ReviewResult> {
  const response = await fetch('/api/review', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred during server review analysis.';
    try {
      const errData = await response.json();
      if (errData.error) {
        errorMessage = errData.error;
      }
    } catch {
      // Ignore JSON parse error if response body is non-JSON
    }
    throw new Error(errorMessage);
  }

  const result: ReviewResult = await response.json();
  return result;
}
