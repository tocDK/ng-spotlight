// Plain JS setup: initializes the Angular TestBed. Every TestBed in this repo also adds
// provideZonelessChangeDetection() to its providers.
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting(), {
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});

// jsdom has no canvas; axe's colour-contrast rule probes getContext and logs a "not implemented" error.
HTMLCanvasElement.prototype.getContext = () => null;

// jsdom's CSS parser rejects the CDK overlay's `@layer cdk-overlay` rule and reports it on stderr; drop only that one.
const writeStderr = process.stderr.write.bind(process.stderr);
process.stderr.write = (chunk, ...rest) =>
  String(chunk).startsWith('Error: Could not parse CSS stylesheet') && String(chunk).includes('@layer cdk-overlay') ? true : writeStderr(chunk, ...rest);
