const Enquiry = require("../../model/ProductionTransactions/enquiry");
const EnquiryDetail = require("../../model/ProductionTransactions/enquiryDetail");
const { Op } = require("sequelize");

const TODAY = () => new Date().toISOString().split("T")[0];

function sanitizeDetail(d = {}) {
    return {
        colour: String(d.colour || ""),
        counts: String(d.counts || ""),
        yarnType: String(d.yarnType || ""),
        enqQty: Number(d.enqQty || 0),
        exShadeNo: String(d.exShadeNo || "")
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

    if (month < 4)
        return `${(year - 1)
            .toString()
            .slice(-2)}-${year.toString().slice(-2)}`;

    return `${year
        .toString()
        .slice(-2)}-${(year + 1)
            .toString()
            .slice(-2)}`;

}
async function generateDocId() {
    const fy = getFinancialYear();
    const prefix = "ENQ/";
    const last = await Enquiry.findOne({
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
// ─────────────────────────────────────────────
// GET ALL ENQUIRIES
// ─────────────────────────────────────────────
exports.getAll = async (req, res) => {
    try {
        const enquiries = await Enquiry.findAll({
            include: ["details"],
            order: [["createdAt", "DESC"]]
        });
        res.json({
            success: true,
            data: enquiries
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ─────────────────────────────────────────────
// GET SINGLE ENQUIRY
// ─────────────────────────────────────────────

exports.getOne = async (req, res) => {

    try {
        const enquiry = await Enquiry.findByPk(req.params.id, {
            include: ["details"]
        });
        if (!enquiry) {
            return res.status(404).json({
                success: false,
                message: "Enquiry not found"
            });
        }
        res.json({
            success: true,
            data: enquiry
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

// ─────────────────────────────────────────────
// GET NEXT DOCUMENT NUMBER
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// CREATE ENQUIRY
// ─────────────────────────────────────────────

exports.create = async (req, res) => {

    try {
        const body = sanitizeBody(req.body);
        if (!body.docId)
            body.docId = await generateDocId();
        const enquiry = await Enquiry.create(body, {
            include: ["details"]
        });
        res.status(201).json({
            success: true,
            data: enquiry
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message
        });
    }
};

// ─────────────────────────────────────────────
// UPDATE ENQUIRY
// ─────────────────────────────────────────────

exports.update = async (req, res) => {
    try {
        const enquiry = await Enquiry.findByPk(req.params.id);
        if (!enquiry) {
            return res.status(404).json({
                success: false,
                message: "Enquiry not found"
            });
        }
        const body = sanitizeBody(req.body);
        await enquiry.update(body);
        await EnquiryDetail.destroy({
            where: {
                enquiryId: enquiry.id
            }
        });
        if (body.details.length) {
            const details = body.details.map(d => ({
                ...d,
                enquiryId: enquiry.id
            }));
            await EnquiryDetail.bulkCreate(details);
        }
        const updated = await Enquiry.findByPk(enquiry.id, {
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

// ─────────────────────────────────────────────
// DELETE ENQUIRY
// ─────────────────────────────────────────────

exports.remove = async (req, res) => {
    try {
        const enquiry = await Enquiry.findByPk(req.params.id);
        if (!enquiry) {
            return res.status(404).json({
                success: false,
                message: "Enquiry not found"
            });
        }
        await enquiry.destroy();
        res.json({
            success: true,
            message: "Enquiry deleted successfully"
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

