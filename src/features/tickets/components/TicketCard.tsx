import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { PassengerBadge } from "@/shared/ui/passenger-badge";
import { formatETB, formatDate, formatTime12h } from "@/shared/lib/format";
import type { Ticket, TicketSummary } from "../schemas";

export interface TicketCardProps {
  ticket: Ticket | TicketSummary;
  className?: string;
}

export function TicketCard({ ticket, className }: TicketCardProps) {
  const passengerCount = ticket.passenger_count ?? ticket.quantity ?? 1;
  const isMulti = passengerCount > 1;
  const routeName = typeof ticket.route_name === "string" ? ticket.route_name : null;
  const publicBusNumber =
    ticket.public_bus_number !== undefined && ticket.public_bus_number !== null
      ? String(ticket.public_bus_number)
      : null;
  const amount =
    ticket.amount !== undefined && ticket.amount !== null
      ? String(ticket.amount)
      : "0";

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-bold font-mono tracking-wider">
            {ticket.code || (ticket.id ? ticket.id.slice(0, 8) : "Ticket")}
          </CardTitle>
          {ticket.status && (
            <Badge
              variant={
                ticket.status === "valid" || ticket.status === "issued"
                  ? "success"
                  : ticket.status === "used" || ticket.status === "validated"
                  ? "accent"
                  : "secondary"
              }
              className="text-[10px] capitalize"
            >
              {ticket.status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {/* Route & Bus Info */}
        {(routeName || publicBusNumber) && (
          <div className="flex items-center gap-2 text-foreground">
            {publicBusNumber && (
              <span className="bus-number-badge">Line {publicBusNumber}</span>
            )}
            {routeName && (
              <span className="font-medium truncate">{routeName}</span>
            )}
          </div>
        )}

        {/* Pricing & Passenger Count */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-2.5">
          <div>
            <span className="text-[10px] uppercase text-muted-foreground block font-semibold">
              Total Fare
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-base font-bold text-foreground">
                {formatETB(amount)}
              </span>
              {isMulti && ticket.unit_fare && (
                <span className="text-[10px] text-muted-foreground">
                  ({formatETB(ticket.unit_fare as string | number)} / pers.)
                </span>
              )}
            </div>
          </div>

          {/* Passenger Count Badge */}
          <PassengerBadge
            count={passengerCount}
            unitFare={ticket.unit_fare}
            size="md"
          />
        </div>

        {/* Timestamps */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
          {ticket.issued_at && (
            <div>
              <span>Issued: </span>
              <span className="text-foreground font-mono">
                {formatTime12h(ticket.issued_at)}
              </span>
            </div>
          )}
          {ticket.expires_at && (
            <div>
              <span>Expires: </span>
              <span className="text-foreground font-mono">
                {formatTime12h(ticket.expires_at)}
              </span>
              <span className="ml-1 opacity-75">({formatDate(ticket.expires_at)})</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
