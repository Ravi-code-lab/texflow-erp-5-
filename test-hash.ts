import { createHash } from 'crypto';

const hash = createHash('sha256').update('admin123').digest('hex');
console.log('admin123 hash:', hash);
