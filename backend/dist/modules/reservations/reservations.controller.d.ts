import { ReservationsService, CreateReservationDto, UpdateReservationDto } from './reservations.service';
export declare class ReservationsController {
    private readonly service;
    constructor(service: ReservationsService);
    findAll(clientId?: string): Promise<import("./reservation.entity").Reservation[]>;
    findOne(id: number): Promise<import("./reservation.entity").Reservation>;
    create(dto: CreateReservationDto): Promise<import("./reservation.entity").Reservation>;
    update(id: number, dto: UpdateReservationDto): Promise<import("./reservation.entity").Reservation>;
    remove(id: number): Promise<import("./reservation.entity").Reservation>;
}
