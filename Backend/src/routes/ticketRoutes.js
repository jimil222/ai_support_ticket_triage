const express = require('express');
const router = express.Router();
const { createTicket, getTicketById,getAllTickets } = require('../controllers/ticketController');

// POST /api/tickets
router.post('/', createTicket);
router.get('/', getAllTickets);
router.get('/:id',getTicketById)

module.exports = router;

