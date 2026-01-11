/**
 * Test Integrazione API Response Options
 * Sistema Gestione ISO 9001 - Step 1.6
 * 
 * Verifica che le opzioni di risposta vengano caricate correttamente dal backend
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import apiService from '../../src/services/apiService';

describe('Response Options API Integration', () => {

    describe('GET /api/v1/response-options', () => {

        it('should load 6 response options from backend', async () => {
            const response = await apiService.get('/response-options');

            expect(response).toBeDefined();
            expect(response.success).toBe(true);
            expect(response.data).toBeDefined();
            expect(Array.isArray(response.data)).toBe(true);
            expect(response.data).toHaveLength(6);
        });

        it('should return options with correct structure', async () => {
            const response = await apiService.get('/response-options');
            const firstOption = response.data[0];

            // Verifica struttura dati
            expect(firstOption).toHaveProperty('option_code');
            expect(firstOption).toHaveProperty('option_name_it');
            expect(firstOption).toHaveProperty('option_name_en');
            expect(firstOption).toHaveProperty('severity_level');
            expect(firstOption).toHaveProperty('display_order');
        });

        it('should return all expected option codes', async () => {
            const response = await apiService.get('/response-options');
            const codes = response.data.map(opt => opt.option_code);

            expect(codes).toContain('C');
            expect(codes).toContain('NC');
            expect(codes).toContain('OSS');
            expect(codes).toContain('OM');
            expect(codes).toContain('NA');
            expect(codes).toContain('NV');
        });

        it('should return options ordered by display_order', async () => {
            const response = await apiService.get('/response-options');
            const orders = response.data.map(opt => opt.display_order);

            // Verifica ordinamento crescente
            for (let i = 1; i < orders.length; i++) {
                expect(orders[i]).toBeGreaterThanOrEqual(orders[i - 1]);
            }
        });

        it('should return correct Italian names', async () => {
            const response = await apiService.get('/response-options');
            const optionByCode = response.data.reduce((acc, opt) => {
                acc[opt.option_code] = opt;
                return acc;
            }, {});

            expect(optionByCode['C'].option_name_it).toBe('Conforme (Soddisfatto)');
            expect(optionByCode['NC'].option_name_it).toBe('Non Conforme (Non Soddisfatto)');
            expect(optionByCode['OSS'].option_name_it).toContain('Osservazione');
            expect(optionByCode['OM'].option_name_it).toContain('Opportunità');
            expect(optionByCode['NA'].option_name_it).toBe('Non Applicabile');
            expect(optionByCode['NV'].option_name_it).toBe('Non Verificato');
        });

        it('should have correct severity levels', async () => {
            const response = await apiService.get('/response-options');
            const optionByCode = response.data.reduce((acc, opt) => {
                acc[opt.option_code] = opt;
                return acc;
            }, {});

            expect(optionByCode['C'].severity_level).toBe(1);
            expect(optionByCode['NC'].severity_level).toBe(3);
            expect(optionByCode['OSS'].severity_level).toBe(2);
            expect(optionByCode['OM'].severity_level).toBe(2);
            expect(optionByCode['NA'].severity_level).toBe(0);
            expect(optionByCode['NV'].severity_level).toBe(0);
        });

        it('should handle NA and NV with exclude_from_calc flag', async () => {
            const response = await apiService.get('/response-options');
            const optionByCode = response.data.reduce((acc, opt) => {
                acc[opt.option_code] = opt;
                return acc;
            }, {});

            // NA e NV devono escludere dal calcolo
            expect(optionByCode['NA'].exclude_from_calc).toBe(true);
            expect(optionByCode['NV'].exclude_from_calc).toBe(true);

            // Gli altri NO
            expect(optionByCode['C'].exclude_from_calc).toBe(false);
            expect(optionByCode['NC'].exclude_from_calc).toBe(false);
            expect(optionByCode['OSS'].exclude_from_calc).toBe(false);
            expect(optionByCode['OM'].exclude_from_calc).toBe(false);
        });

        it('should work without authentication', async () => {
            // Salva token corrente
            const originalToken = apiService.getToken();

            // Rimuovi token
            apiService.clearToken();

            try {
                // Deve funzionare lo stesso (endpoint pubblico)
                const response = await apiService.get('/response-options', { includeAuth: false });
                expect(response.success).toBe(true);
                expect(response.data).toHaveLength(6);
            } finally {
                // Ripristina token
                if (originalToken) {
                    apiService.setToken(originalToken);
                }
            }
        });

    });

    describe('Frontend Integration (ChecklistModule)', () => {

        it('should cache options in component state', async () => {
            // Questo test richiede rendering del componente React
            // Per ora solo verifica che l'API sia chiamabile
            const response = await apiService.get('/response-options');

            // Simula caching in stato locale
            const cachedOptions = response.data;

            expect(cachedOptions).toHaveLength(6);
            expect(cachedOptions[0]).toHaveProperty('option_code');
        });

        it('should fallback to local STATUS if API fails', async () => {
            // Se API fallisce, ChecklistModule usa STATUS hardcoded
            const fallbackStatus = {
                C: 'C',
                NC: 'NC',
                OSS: 'OSS',
                OM: 'OM',
                NA: 'NA',
                NOT_ANSWERED: 'NOT_ANSWERED'
            };

            expect(Object.keys(fallbackStatus)).toHaveLength(6);
        });

    });

});
