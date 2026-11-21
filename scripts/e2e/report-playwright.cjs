'use strict';

const fs = require('node:fs');
const path = require('node:path');

// No environment dump, auth response bodies, or arbitrary logs are included.
// Standard Playwright evidence is written only inside the wrapper's allowlisted root.
class AcceptanceReporter {
  onBegin(config, suite) {
    this.config = config;
    this.tests = suite.allTests();
    this.results = new Map();
    this.errors = 0;
    const inventory = this.tests.map((test) => this.identity(test));
    const target = process.env.GRIDO_REPORT_INVENTORY_FILE;
    if (target) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, JSON.stringify({ tests: inventory }, null, 2) + '\n');
    }
  }

  identity(test) {
    return {
      id: test.id,
      project: test.parent.project()?.name || '',
      file: path.relative(this.config.rootDir, test.location.file).replace(/\\/g, '/'),
      title: test.titlePath().filter(Boolean).join(' > '),
      expectedStatus: test.expectedStatus,
      repeatEachIndex: test.repeatEachIndex,
      annotations: test.annotations.map(({ type, description }) => ({ type, description })),
      tags: test.tags || [],
    };
  }

  onTestEnd(test, result) {
    const attempts = this.results.get(test.id) || [];
    attempts.push({
      status: result.status,
      retry: result.retry,
      duration: result.duration,
      errorCount: result.errors.length,
      attachments: result.attachments.filter((item) => item.path).map((item) => ({
        name: item.name,
        contentType: item.contentType,
        path: path.relative(process.env.GRIDO_REPORT_DIR, item.path).replace(/\\/g, '/'),
      })),
    });
    this.results.set(test.id, attempts);
  }

  onError(error) {
    this.errors += 1;
    const detail = error?.message || (typeof error === 'string' ? error : 'Unknown Playwright error');
    process.stderr.write(`[acceptance-reporter] ${detail}\n`);
  }

  onEnd(result) {
    if (process.env.GRIDO_REPORT_MODE === 'list') return;
    const target = process.env.GRIDO_REPORT_EXECUTION_FILE;
    if (!target) throw new Error('Acceptance execution output is not configured');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify({
      status: result.status,
      globalErrorCount: this.errors,
      tests: (this.tests || []).map((test) => ({
        ...this.identity(test),
        outcome: test.outcome(),
        attempts: this.results.get(test.id) || [],
      })),
    }, null, 2) + '\n');
  }
}

module.exports = AcceptanceReporter;
