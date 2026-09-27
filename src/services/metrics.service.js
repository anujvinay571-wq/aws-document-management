const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');
const logger = require('../utils/logger');

const cloudWatchClient = new CloudWatchClient({ region: process.env.AWS_REGION });

exports.putMetricData = async (metrics) => {
  try {
    const metricData = metrics.map(m => ({
      MetricName: m.MetricName,
      Value: m.Value,
      Unit: m.Unit || 'Count',
      Timestamp: new Date(),
    }));

    const command = new PutMetricDataCommand({
      Namespace: 'AWSDocumentManagement',
      MetricData: metricData,
    });

    await cloudWatchClient.send(command);
  } catch (error) {
    logger.error('CloudWatch metric publish failed', { error });
  }
};
