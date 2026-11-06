const { prisma } = require('../config/database');
const { CATEGORIES, PRIORITIES } = require('../constants/triageOptions');
// Regular expressions for email validation.
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


// Function for Ticket Creation.
async function createTicket(req, res) {
  try {
    // 1. Ensure request body is an object and not null or an array
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: ['Request body must be a valid JSON object']
      });
    }

    const errors = [];
    const { subject, body, customerEmail } = req.body;

    // 2. Validate subject
    let trimmedSubject = '';
    if (subject === undefined || subject === null) {
      errors.push('Subject is required');
    } else if (typeof subject !== 'string') {
      errors.push('Subject must be a string');
    } else {
      trimmedSubject = subject.trim();
      if (trimmedSubject.length === 0) {
        errors.push('Subject cannot be empty');
      } else if (trimmedSubject.length > 255) {
        errors.push('Subject must not exceed 255 characters');
      }
    }

    // 3. Validate body
    let trimmedBody = '';
    if (body === undefined || body === null) {
      errors.push('Body is required');
    } else if (typeof body !== 'string') {
      errors.push('Body must be a string');
    } else {
      trimmedBody = body.trim();
      if (trimmedBody.length === 0) {
        errors.push('Body cannot be empty');
      }
    }

    // 4. Validate customerEmail
    let trimmedEmail = '';
    if (customerEmail === undefined || customerEmail === null) {
      errors.push('Customer email is required');
    } else if (typeof customerEmail !== 'string') {
      errors.push('Customer email must be a string');
    } else {
      trimmedEmail = customerEmail.trim();
      if (trimmedEmail.length === 0) {
        errors.push('Customer email cannot be empty');
      } else if (trimmedEmail.length > 255) {
        errors.push('Customer email must not exceed 255 characters');
      } else if (!emailRegex.test(trimmedEmail)) {
        errors.push('Please provide a valid email address');
      }
    }

    // Return all validation errors together if any validation failed
    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors
      });
    }

    // 5. If all the validations are passed then save the ticket in the db.
    const ticket = await prisma.ticket.create({
      data: {
        subject: trimmedSubject,
        body: trimmedBody,
        customerEmail: trimmedEmail
      }
    });

    // 6. Return 201 Created with generated ticket ID and default status
    return res.status(201).json({
      id: ticket.id,
      status: ticket.status
    });

  } catch (error) {
    console.error('Error creating ticket:', error);
    return res.status(500).json({
      message: 'Failed to create ticket'
    });
  }
}

// Function for getting the ticket by its id.
async function getTicketById(req, res) {
  try {
    const { id } = req.params;

    // 1. Validate ticket ID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        message: 'Invalid ticket ID format'
      });
    }

    // 2. Fetch ticket along with its triage result
    const ticket = await prisma.ticket.findUnique({
      where: {
        id: id
      },
      select: {
        id: true,
        subject: true,
        body: true,
        customerEmail: true,
        status: true,
        retryCount: true,
        createdAt: true,
        updatedAt: true,
        triageResult: {
          select: {
            category: true,
            priority: true,
            summary: true,
            createdAt: true
          }
        }
      }
    });

    // 3. Check whether ticket exists
    if (!ticket) {
      return res.status(404).json({
        message: 'Ticket not found'
      });
    }

    // 4. Return ticket details
    return res.status(200).json(ticket);

  } catch (error) {
    console.error('Error fetching ticket:', error);

    return res.status(500).json({
      message: 'Failed to fetch ticket'
    });
  }
}

const TICKET_STATUSES = [
  'pending',
  'processing',
  'retry_wait',
  'completed',
  'needs_review'
];

// Function for getting all the tickets with pagination and filters.
async function getAllTickets(req, res) {
  try {
    const { status, category, priority } = req.query;

    // 1. Read pagination parameters
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    // 2. Validate filters
    if (status && !TICKET_STATUSES.includes(status)) {
      return res.status(400).json({
        message: 'Invalid status filter'
      });
    }

    if (category && !CATEGORIES.includes(category)) {
      return res.status(400).json({
        message: 'Invalid category filter'
      });
    }

    if (priority && !PRIORITIES.includes(priority)) {
      return res.status(400).json({
        message: 'Invalid priority filter'
      });
    }

    // 3. Validate pagination
    if (
      !Number.isInteger(page) ||
      !Number.isInteger(limit) ||
      page < 1 ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        message: 'Page must be a positive integer and limit must be between 1 and 100'
      });
    }

    // 4. Calculate records to skip
    const skip = (page - 1) * limit;

    // 5. Build dynamic filters
    const where = {};

    if (status) {
      where.status = status;
    }

    if (category || priority) {
      where.triageResult = {
        is: {}
      };

      if (category) {
        where.triageResult.is.category = category;
      }

      if (priority) {
        where.triageResult.is.priority = priority;
      }
    }

    // 6. Fetch tickets and total matching count
    const [tickets, totalTickets] = await Promise.all([
      prisma.ticket.findMany({
        where,
        select: {
          id: true,
          subject: true,
          body: true,
          customerEmail: true,
          status: true,
          retryCount: true,
          createdAt: true,
          updatedAt: true,
          triageResult: {
            select: {
              category: true,
              priority: true,
              summary: true,
              createdAt: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),

      prisma.ticket.count({
        where
      })
    ]);

    // 7. Return paginated response
    return res.status(200).json({
      data: tickets,
      pagination: {
        currentPage: page,
        limit,
        totalTickets,
        totalPages: Math.ceil(totalTickets / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching tickets:', error);

    return res.status(500).json({
      message: 'Failed to fetch tickets'
    });
  }
}

module.exports = {
  createTicket,
  getTicketById,
  getAllTickets
};

