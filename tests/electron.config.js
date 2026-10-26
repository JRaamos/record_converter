import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./electron',timeout:60000,workers:1,use:{trace:'retain-on-failure'}});
