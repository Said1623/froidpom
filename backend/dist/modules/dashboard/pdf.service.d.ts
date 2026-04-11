import { Response } from 'express';
export declare class PdfService {
    private createDoc;
    private tableHeader;
    private tableRow;
    genererRapportStock(data: any, res: Response): Promise<void>;
    genererRapportClients(clients: any[], res: Response): Promise<void>;
    genererRapportPaiements(data: any, res: Response): Promise<void>;
}
