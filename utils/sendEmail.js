const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const handlebars = require("handlebars");

const sendEmail = async (subject, send_to, sent_from, reply_to, template, name, link) => {
  // ✅ Path to the .handlebars file
  const templatePath = path.join(__dirname, "../views", `${template}.handlebars`);

  // ✅ Compile template
  const source = fs.readFileSync(templatePath, "utf-8").toString();
  const compiledTemplate = handlebars.compile(source);
  const html = compiledTemplate({ name, link });

  // ✅ Setup transport
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: 587,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // ✅ Send mail
  const options = {
    from: sent_from,
    to: send_to,
    replyTo: reply_to,
    subject: subject,
    html: html,
  };

  const info = await transporter.sendMail(options);
  return info;
};

module.exports = sendEmail;
