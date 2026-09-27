const crypto = require('crypto');
const Document = require('../models/Document');
const { uploadObject, deleteObject, getDownloadUrl } = require('../services/s3.service');
const { publishDocumentUploadedEvent } = require('../services/sns.service');
const { putMetricData } = require('../services/metrics.service');
const logger = require('../utils/logger');

exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Document file is required' });
    }

    const userId = req.user.id;
    const safeOriginalName = req.file.safeOriginalName;
    const uuid = crypto.randomUUID();
    const objectKey = `documents/${userId}/${uuid}-${safeOriginalName}`;
    const bucket = process.env.AWS_S3_BUCKET;

    // Upload to S3
    try {
      await uploadObject(objectKey, req.file.buffer, req.file.mimetype);
    } catch (s3Error) {
      putMetricData([
        { MetricName: 'S3OperationFailureCount', Value: 1 },
        { MetricName: 'UploadFailureCount', Value: 1 }
      ]);
      throw s3Error;
    }

    let document;
    try {
      // Save metadata to MongoDB
      document = await Document.create({
        userId,
        originalName: safeOriginalName,
        objectKey,
        bucket,
        mimeType: req.file.mimetype,
        size: req.file.size,
      });
    } catch (error) {
      // Rollback S3 upload if MongoDB save fails
      try {
        await deleteObject(objectKey);
      } catch (rollbackError) {
        logger.error('Failed to rollback S3 object after MongoDB error', { error: rollbackError, objectKey, userId });
        putMetricData([{ MetricName: 'S3OperationFailureCount', Value: 1 }]);
      }
      putMetricData([{ MetricName: 'UploadFailureCount', Value: 1 }]);
      throw error;
    }

    try {
      await publishDocumentUploadedEvent({
        eventType: 'DOCUMENT_UPLOADED',
        eventId: crypto.randomUUID(),
        userId: req.user.id,
        objectKey: document.objectKey,
        bucket: document.bucket,
        fileName: document.originalName,
        timestamp: new Date().toISOString(),
      });
    } catch (snsError) {
      logger.error('SNS Publish failed for document upload', { error: snsError, objectKey, userId });
      putMetricData([{ MetricName: 'SNSPublishFailureCount', Value: 1 }]);
      return next(snsError);
    }

    putMetricData([{ MetricName: 'UploadSuccessCount', Value: 1 }]);

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: {
        id: document._id,
        fileName: document.originalName,
        mimeType: document.mimeType,
        size: document.size,
        createdAt: document.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.listDocuments = async (req, res, next) => {
  try {
    const documents = await Document.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      documents: documents.map((doc) => ({
        id: doc._id,
        fileName: doc.originalName,
        mimeType: doc.mimeType,
        size: doc.size,
        createdAt: doc.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

exports.downloadDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const downloadUrl = await getDownloadUrl(document.objectKey);

    res.json({ downloadUrl });
  } catch (error) {
    next(error);
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Delete S3 object first
    await deleteObject(document.objectKey);
    
    // Delete MongoDB record
    await Document.deleteOne({ _id: document._id });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    next(error);
  }
};
