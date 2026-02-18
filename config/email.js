const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendConfirmationEmail = async (email, token) => {
  const confirmUrl = `http://localhost:3000/confirm-subscription?token=${token}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '🌿 Confirm Your Swachh Sena Newsletter Subscription',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #28a745, #20c997); padding: 40px 20px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 32px; font-weight: bold; }
          .header p { color: #e8f5e9; margin: 10px 0 0 0; font-size: 16px; }
          .content { padding: 40px 30px; text-align: center; }
          .message { font-size: 18px; color: #333; line-height: 1.6; margin-bottom: 30px; }
          .confirm-button { display: inline-block; background: #28a745; color: white !important; padding: 15px 40px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; font-size: 16px; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 13px; border-top: 1px solid #e0e0e0; }
          .logo { max-width: 150px; height: auto; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://res.cloudinary.com/dezyejwfi/image/upload/v1771428673/xfv1zgx12afop0f9oze0.png" alt="Swachh Sena Logo" class="logo">
            <h1>Confirm Your Subscription</h1>
            <p>One more step to join our community</p>
          </div>
          <div class="content">
            <p class="message">Thank you for your interest in Swachh Sena! Please confirm your email address to complete your newsletter subscription.</p>
            <a href="${confirmUrl}" class="confirm-button">Confirm Subscription</a>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
          </div>
          <div class="footer">
            <p><strong>Swachh Sena</strong> - Together for a Cleaner Tomorrow</p>
            <p style="margin-top: 15px; color: #999;">© 2026 Swachh Sena. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
  await transporter.sendMail(mailOptions);
};

const sendRenewalEmail = async (email, token) => {
  const renewUrl = `http://localhost:3000/renew-subscription?token=${token}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '🔄 Renew Your Swachh Sena Newsletter Subscription',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #28a745, #20c997); padding: 40px 20px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 32px; font-weight: bold; }
          .header p { color: #e8f5e9; margin: 10px 0 0 0; font-size: 16px; }
          .content { padding: 40px 30px; text-align: center; }
          .message { font-size: 18px; color: #333; line-height: 1.6; margin-bottom: 30px; }
          .renew-button { display: inline-block; background: #28a745; color: white !important; padding: 15px 40px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; font-size: 16px; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 13px; border-top: 1px solid #e0e0e0; }
          .logo { max-width: 150px; height: auto; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://res.cloudinary.com/dezyejwfi/image/upload/v1771428673/xfv1zgx12afop0f9oze0.png" alt="Swachh Sena Logo" class="logo">
            <h1>Renew Your Subscription</h1>
            <p>Continue receiving updates from us</p>
          </div>
          <div class="content">
            <p class="message">It's been 30 days since you joined Swachh Sena! We hope you've enjoyed our updates. Click below to renew your subscription and continue receiving our newsletters.</p>
            <a href="${renewUrl}" class="renew-button">Renew Subscription</a>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">If you no longer wish to receive our emails, simply ignore this message.</p>
          </div>
          <div class="footer">
            <p><strong>Swachh Sena</strong> - Together for a Cleaner Tomorrow</p>
            <p style="margin-top: 15px; color: #999;">© 2026 Swachh Sena. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
  await transporter.sendMail(mailOptions);
};

const sendWelcomeEmail = async (email, token) => {
  const unsubscribeUrl = `http://localhost:3000/unsubscribe?token=${token}`;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '🌿 Welcome to Swachh Sena Community!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #28a745, #20c997); padding: 40px 20px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 32px; font-weight: bold; }
          .header p { color: #e8f5e9; margin: 10px 0 0 0; font-size: 16px; }
          .content { padding: 40px 30px; }
          .welcome-text { font-size: 18px; color: #333; line-height: 1.6; margin-bottom: 20px; }
          .benefits { background: #f8f9fa; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .benefits h3 { color: #28a745; margin-top: 0; font-size: 20px; }
          .benefits ul { margin: 15px 0; padding-left: 20px; }
          .benefits li { color: #555; margin: 10px 0; font-size: 15px; line-height: 1.5; }
          .cta-button { display: inline-block; background: #28a745; color: white !important; padding: 15px 40px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; font-size: 16px; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 13px; border-top: 1px solid #e0e0e0; }
          .unsubscribe { margin-top: 10px; }
          .unsubscribe a { color: #999; text-decoration: none; font-size: 12px; }
          .logo { max-width: 150px; height: auto; margin-bottom: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://res.cloudinary.com/dezyejwfi/image/upload/v1771428673/xfv1zgx12afop0f9oze0.png" alt="Swachh Sena Logo" class="logo">
            <h1>Welcome to Swachh Sena!</h1>
            <p>Join us in making our city cleaner and greener</p>
          </div>
          <div class="content">
            <p class="welcome-text">Dear Community Member,</p>
            <p class="welcome-text">Thank you for joining the Swachh Sena community! We're excited to have you on board in our mission to create a cleaner, healthier environment for everyone.</p>
            
            <div class="benefits">
              <h3>📬 What You'll Receive:</h3>
              <ul>
                <li>🚀 <strong>Latest Cleanup Drives:</strong> Be the first to know about upcoming community cleanup events</li>
                <li>🌱 <strong>Environmental Tips:</strong> Practical advice on sustainable living and waste management</li>
                <li>🤝 <strong>Volunteer Opportunities:</strong> Exclusive invitations to make a real difference</li>
                <li>📊 <strong>Impact Updates:</strong> See the positive change we're creating together</li>
                <li>🎉 <strong>Community Stories:</strong> Inspiring success stories from fellow members</li>
              </ul>
            </div>
            
            <p class="welcome-text">Ready to make an impact? Start by reporting garbage spots in your area or join our next cleanup drive!</p>
            
            <center>
              <a href="http://localhost:3000" class="cta-button">Visit Swachh Sena Platform</a>
            </center>
          </div>
          <div class="footer">
            <p><strong>Swachh Sena</strong> - Together for a Cleaner Tomorrow</p>
            <p>If you didn't subscribe to this newsletter, please ignore this email.</p>
            <p class="unsubscribe"><a href="${unsubscribeUrl}">Unsubscribe</a></p>
            <p style="margin-top: 15px; color: #999;">© 2026 Swachh Sena. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendConfirmationEmail, sendRenewalEmail, sendWelcomeEmail };
