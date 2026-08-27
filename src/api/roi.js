import client from './client'

export const getRoiForecast = (eventId, ticketPrice = 500, expectedTickets = 200) =>
  client.get(`/api/events/${eventId}/roi-forecast`, {
    params: { ticket_price: ticketPrice, expected_tickets: expectedTickets }
  }).then((r) => r.data)
