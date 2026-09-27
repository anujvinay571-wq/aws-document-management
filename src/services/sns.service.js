const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const snsClient = new SNSClient({ region: process.env.AWS_REGION });

exports.publishDocumentUploadedEvent = async (event) => {
  const command = new PublishCommand({
    TopicArn: process.env.AWS_SNS_TOPIC_ARN,
    Message: JSON.stringify(event),
  });

  return await snsClient.send(command);
};
