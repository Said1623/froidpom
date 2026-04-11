import { Repository } from 'typeorm';
import { Reservation, StatutReservation } from './reservation.entity';
export declare class CreateReservationDto {
    clientId: number;
    dateReservation: string;
    dateSortiePrevisionnelle?: string;
    nbCaissesBois?: number;
    nbCaissesPластique?: number;
    nbCaissesTranger?: number;
    prixUnitaireBois?: number;
    prixUnitairePlastique?: number;
    prixUnitaireTranger?: number;
    notes?: string;
}
export declare class UpdateReservationDto {
    dateReservation?: string;
    dateSortiePrevisionnelle?: string;
    nbCaissesBois?: number;
    nbCaissesPластique?: number;
    nbCaissesTranger?: number;
    prixUnitaireBois?: number;
    prixUnitairePlastique?: number;
    prixUnitaireTranger?: number;
    statut?: StatutReservation;
    notes?: string;
}
export declare class ReservationsService {
    private readonly repo;
    constructor(repo: Repository<Reservation>);
    findAll(clientId?: number): Promise<Reservation[]>;
    findOne(id: number): Promise<Reservation>;
    create(dto: CreateReservationDto): Promise<Reservation>;
    update(id: number, dto: UpdateReservationDto): Promise<Reservation>;
    remove(id: number): Promise<Reservation>;
    getMontantParClient(clientId: number): Promise<{
        reservations: Reservation[];
        total: number;
    }>;
}
