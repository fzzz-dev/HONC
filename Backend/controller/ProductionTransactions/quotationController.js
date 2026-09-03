const Quotation = require("../../model/ProductionTransactions/quotation");
const QuotationDetail = require("../../model/ProductionTransactions/quotationDetail");

const { Op } = require("sequelize");

// ------------------------------------------------
// Helpers
// ------------------------------------------------

const TODAY = () => new Date().toISOString().split("T")[0];
function sanitizeDetail(d = {}) {
    return {
        colour: String(d.colour || ""),
        counts: String(d.counts || ""),
        yarnType: String(d.yarnType || ""),
        enqQty: Number(d.enqQty || 0),
        qtyRate: Number(d.qtyRate || 0),
        rate2: Number(d.rate2 || 0),
        rate3: Number(d.rate3 || 0),
        confirmationRate: String(d.confirmationRate || "N")
    };
}

function sanitizeBody(body = {}) {
    const details = Array.isArray(body.details)
        ? body.details
        : [];
    return {
        docId: String(body.docId || "").trim(),
        date: String(body.date || TODAY()),
        customerId: body.customer || body.customerId || null,
        customerName: String(body.customerName || ""),
        enqRefNo: String(body.enqRefNo || ""),
        refDate: String(body.refDate || ""),
        styleRefNo: String(body.styleRefNo || ""),
        enqNo: String(body.enqNo || ""),
        preparedBy: String(body.preparedBy || "Admin"),
        remarks: String(body.remarks || ""),
        details: details.map(sanitizeDetail),
        totalQty: details.reduce(
            (sum, d) => sum + Number(d.enqQty || 0),
            0
        ),
        totalItems: details.length
    };
}

function getFinancialYear() {
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    if (month < 4) {
        return `${(year - 1).toString().slice(-2)}-${year.toString().slice(-2)}`;
    }
    return `${year.toString().slice(-2)}-${(year + 1).toString().slice(-2)}`;
}

async function generateDocId() {
    const fy = getFinancialYear();
    const prefix = "QUOT/";
    const last = await Quotation.findOne({
        where: {
            docId: {
                [Op.like]: `${prefix}%/${fy}`
            }
        },
        order: [["docId", "DESC"]]
    });
    let next = 1;
    if (last) {
        const parts = last.docId.split("/");
        next = parseInt(parts[1]) + 1;
    }
    return `${prefix}${String(next).padStart(4, "0")}/${fy}`;
}

// ------------------------------------------------
// GET ALL
// ------------------------------------------------

exports.getAll = async (req, res) => {
    try {
        const quotations = await Quotation.findAll({
            include: ["details"],
            order: [["createdAt", "DESC"]]
        });
        res.json({
            success: true,
            data: quotations
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ------------------------------------------------
// GET ONE
// ------------------------------------------------

exports.getOne = async (req, res) => {
    try {
        const quotation = await Quotation.findByPk(req.params.id, {
            include: ["details"]
        });
        if (!quotation) {
            return res.status(404).json({
                success: false,
                message: "Quotation not found"
            });
        }
        res.json({
            success: true,
            data: quotation
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ------------------------------------------------
// NEXT NUMBER
// ------------------------------------------------

exports.getNextNumber = async (req, res) => {
    try {
        const docId = await generateDocId();
        res.json({
            success: true,
            docId
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ------------------------------------------------
// CREATE
// ------------------------------------------------

exports.create = async (req, res) => {
    try {
        const body = sanitizeBody(req.body);
        if (!body.docId) {
            body.docId = await generateDocId();
        }
        const quotation = await Quotation.create(body, {
            include: ["details"]
        });
        res.status(201).json({
            success: true,
            data: quotation
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

// ------------------------------------------------
// UPDATE
// ------------------------------------------------

exports.update = async (req, res) => {
    try {
        const quotation = await Quotation.findByPk(req.params.id);
        if (!quotation) {
            return res.status(404).json({
                success: false,
                message: "Quotation not found"
            });
        }
        const body = sanitizeBody(req.body);
        await quotation.update(body);
        await QuotationDetail.destroy({
            where: {
                quotationId: quotation.id
            }
        });
        if (body.details.length) {
            const details = body.details.map(d => ({
                ...d,
                quotationId: quotation.id
            }));
            await QuotationDetail.bulkCreate(details);
        }
        const updated = await Quotation.findByPk(quotation.id, {
            include: ["details"]
        });
        res.json({
            success: true,
            data: updated
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

// ------------------------------------------------
// DELETE
// ------------------------------------------------

exports.remove = async (req, res) => {
    try {
        const quotation = await Quotation.findByPk(req.params.id);
        if (!quotation) {
            return res.status(404).json({
                success: false,
                message: "Quotation not found"
            });
        }
        await quotation.destroy();
        res.json({
            success: true,
            message: "Quotation deleted successfully"
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};