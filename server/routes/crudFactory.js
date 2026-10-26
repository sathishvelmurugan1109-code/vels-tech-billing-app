// server/routes/crudFactory.js — Generic CRUD route factory for business entities
const express = require("express");
const { authenticate } = require("../middleware/auth");

function addIdField(item) {
  if (!item) return item;
  if (Array.isArray(item)) return item.map(addIdField);
  if (item._id && !item.id) {
    item.id = item._id.toString();
  }
  return item;
}

function createCrudRoutes(Model, options = {}) {
  const router = express.Router();
  const { sortField = "createdAt", sortDir = -1, populate = null } = options;

  router.get("/", authenticate, async (req, res) => {
    try {
      const query = { businessId: req.businessId };
      Object.keys(req.query).forEach((key) => {
        if (key !== "page" && key !== "limit" && key !== "sort") {
          query[key] = req.query[key];
        }
      });
      let q = Model.find(query);
      if (populate) q = q.populate(populate);
      q = q.sort({ [sortField]: sortDir });
      const items = await q.lean();
      res.json(addIdField(items));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch", error: err.message });
    }
  });

  router.get("/:id", authenticate, async (req, res) => {
    try {
      let q = Model.findOne({ _id: req.params.id, businessId: req.businessId });
      if (populate) q = q.populate(populate);
      const item = await q.lean();
      if (!item) return res.status(404).json({ message: "Not found" });
      res.json(addIdField(item));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch", error: err.message });
    }
  });

  router.post("/", authenticate, async (req, res) => {
    try {
      const data = { ...req.body, businessId: req.businessId };
      delete data.id;
      delete data._id;
      const item = await Model.create(data);
      const obj = item.toObject();
      addIdField(obj);
      res.status(201).json(obj);
    } catch (err) {
      res.status(500).json({ message: "Failed to create", error: err.message });
    }
  });

  router.put("/:id", authenticate, async (req, res) => {
    try {
      const data = { ...req.body };
      delete data.businessId;
      delete data._id;
      delete data.id;
      const item = await Model.findOneAndUpdate(
        { _id: req.params.id, businessId: req.businessId },
        { $set: data },
        { new: true, runValidators: true }
      );
      if (!item) return res.status(404).json({ message: "Not found" });
      const obj = item.toObject();
      addIdField(obj);
      res.json(obj);
    } catch (err) {
      res.status(500).json({ message: "Failed to update", error: err.message });
    }
  });

  router.delete("/:id", authenticate, async (req, res) => {
    try {
      const item = await Model.findOneAndDelete({ _id: req.params.id, businessId: req.businessId });
      if (!item) return res.status(404).json({ message: "Not found" });
      res.json({ message: "Deleted", id: req.params.id });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete", error: err.message });
    }
  });

  return router;
}

module.exports = createCrudRoutes;