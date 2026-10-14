import * as Sentry from '@sentry/nestjs';
import { initApiSentry } from './sentry-init';

initApiSentry(Sentry, process.env);
