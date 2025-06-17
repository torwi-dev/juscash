"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const publications_1 = __importDefault(require("./publications"));
const scraper_1 = __importDefault(require("./scraper"));
const router = (0, express_1.Router)();
router.get('/status', (req, res) => {
    res.json({
        message: 'JusCash DJE API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
    });
});
router.use('/auth', auth_1.default);
router.use('/scraper', scraper_1.default);
router.use('/publications', publications_1.default);
exports.default = router;
