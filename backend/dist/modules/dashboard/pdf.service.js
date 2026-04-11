"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfService = void 0;
const common_1 = require("@nestjs/common");
const PDFDocument = require("pdfkit");
let PdfService = class PdfService {
    createDoc(title) {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
        doc.rect(0, 0, 595, 70).fill('#0f3460');
        doc.fillColor('white').font('Helvetica-Bold').fontSize(20)
            .text('FROIDPOM', 40, 22);
        doc.fontSize(9).font('Helvetica').text('Gestion Unité Frigorifique', 40, 46);
        doc.fontSize(9).text(now, 0, 46, { align: 'right', width: 555 });
        doc.fillColor('#0f3460').font('Helvetica-Bold').fontSize(14)
            .text(title, 40, 90);
        doc.moveTo(40, 110).lineTo(555, 110).strokeColor('#0f3460').lineWidth(1.5).stroke();
        doc.moveDown(1);
        return doc;
    }
    tableHeader(doc, headers, widths, y) {
        doc.rect(40, y, 515, 20).fill('#e8f0fe');
        let x = 40;
        headers.forEach((h, i) => {
            doc.fillColor('#0f3460').font('Helvetica-Bold').fontSize(9).text(h, x + 4, y + 5, { width: widths[i] - 4 });
            x += widths[i];
        });
        return y + 20;
    }
    tableRow(doc, cells, widths, y, isOdd) {
        if (isOdd)
            doc.rect(40, y, 515, 16).fill('#f8f9ff');
        let x = 40;
        cells.forEach((cell, i) => {
            doc.fillColor('#333').font('Helvetica').fontSize(8).text(cell || '—', x + 4, y + 4, { width: widths[i] - 8 });
            x += widths[i];
        });
        return y + 16;
    }
    async genererRapportStock(data, res) {
        const doc = this.createDoc('Rapport de Stock par Chambre');
        doc.pipe(res);
        let y = 130;
        const headers = ['Chambre', 'Capacité Max', 'Stock Actuel', 'Disponible', 'Taux Remplissage'];
        const widths = [160, 95, 95, 85, 80];
        y = this.tableHeader(doc, headers, widths, y);
        data.chambres.forEach((c, i) => {
            if (y > 750) {
                doc.addPage();
                y = 50;
                y = this.tableHeader(doc, headers, widths, y);
            }
            const taux = `${c.tauxRemplissage}%`;
            y = this.tableRow(doc, [c.nom, String(c.capaciteMax), String(c.stockActuel), String(c.disponible), taux], widths, y, i % 2 === 0);
        });
        y += 20;
        doc.rect(40, y, 515, 22).fill('#0f3460');
        doc.fillColor('white').font('Helvetica-Bold').fontSize(9)
            .text(`TOTAL: ${data.totalStock} / ${data.totalCapacite} caisses (${data.tauxRemplissageGlobal}%)`, 44, y + 6);
        doc.end();
    }
    async genererRapportClients(clients, res) {
        const doc = this.createDoc('Rapport Clients & Stock');
        doc.pipe(res);
        let y = 130;
        const headers = ['Client', 'Téléphone', 'Stock Actuel', 'Total Entré', 'Total Sorti'];
        const widths = [175, 100, 80, 80, 80];
        y = this.tableHeader(doc, headers, widths, y);
        clients.forEach((c, i) => {
            if (y > 750) {
                doc.addPage();
                y = 50;
                y = this.tableHeader(doc, headers, widths, y);
            }
            y = this.tableRow(doc, [c.clientNom, c.telephone || '', String(c.stockActuel), String(c.totalEntree), String(c.totalSortie)], widths, y, i % 2 === 0);
        });
        doc.end();
    }
    async genererRapportPaiements(data, res) {
        const doc = this.createDoc('Rapport Financier — Paiements');
        doc.pipe(res);
        let y = 130;
        doc.rect(40, y, 515, 65).fill('#f0f4ff');
        doc.fillColor('#0f3460').font('Helvetica-Bold').fontSize(11).text('Résumé Financier', 55, y + 10);
        doc.fillColor('#333').font('Helvetica').fontSize(10)
            .text(`Total facturé (réservations): ${Number(data.montantReservations).toFixed(2)} €`, 55, y + 30)
            .text(`Total encaissé: ${Number(data.totalPaye).toFixed(2)} €`, 300, y + 30)
            .text(`Reste à percevoir: ${Number(data.resteAPayer).toFixed(2)} €`, 55, y + 48);
        y += 85;
        const headers = ['Date', 'Client', 'Mode', 'Référence', 'Montant'];
        const widths = [80, 180, 80, 95, 80];
        y = this.tableHeader(doc, headers, widths, y);
        if (data.paiements) {
            data.paiements.forEach((p, i) => {
                if (y > 750) {
                    doc.addPage();
                    y = 50;
                    y = this.tableHeader(doc, headers, widths, y);
                }
                y = this.tableRow(doc, [p.datePaiement, p.client?.nom || '', p.modePaiement, p.reference || '', `${Number(p.montant).toFixed(2)} €`], widths, y, i % 2 === 0);
            });
        }
        doc.end();
    }
};
exports.PdfService = PdfService;
exports.PdfService = PdfService = __decorate([
    (0, common_1.Injectable)()
], PdfService);
//# sourceMappingURL=pdf.service.js.map