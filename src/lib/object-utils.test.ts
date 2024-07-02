import { expect } from 'chai';

import { tryBase64ToJSONString } from './object-utils.js';

describe('tryBase64ToJSONString', () => {
    it('should return decoded JSON string when input is a valid base64 encoded JSON string', () => {
        const jsonString = JSON.stringify({ key: 'value' });
        const base64JsonString = Buffer.from(jsonString).toString('base64');
        const result = tryBase64ToJSONString(base64JsonString);
        expect(result).to.equal(jsonString);
    });

    it('should return original input when input is not a valid base64 encoded JSON string', () => {
        const notBase64String = 'not a base64 string';
        const result = tryBase64ToJSONString(notBase64String);
        expect(result).to.equal(notBase64String);
    });

    it('should return original input when input is not a valid JSON string', () => {
        const notJsonString = 'not a JSON string';
        const base64NotJsonString = Buffer.from(notJsonString).toString('base64');
        const result = tryBase64ToJSONString(base64NotJsonString);
        expect(result).to.equal(base64NotJsonString);
    });
});
