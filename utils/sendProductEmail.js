const nodemailer = require("nodemailer");
const hbs = require("nodemailer-express-handlebars");
const path = require("path");
const Handlebars = require("handlebars");

// 🧠 Handlebars helpers
Handlebars.registerHelper("eq", (a, b) => a === b);
Handlebars.registerHelper("or", function () {
  return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
});

const sendProductEmail = async (options) => {
  const {
    send_to,
    sent_from,
    reply_to,
    subject,
    template,
    link,
    labelProps = {},
    creatorMessage,
    productDetails,
    name,
  } = options;

  // ✉️ Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });

  // 🔧 Register handlebars engine
  const handlebarOptions = {
    viewEngine: {
      extName: ".handlebars",
      partialsDir: path.resolve("./views"),
      defaultLayout: false,
    },
    viewPath: path.resolve("./views"),
    extName: ".handlebars",
  };

  transporter.use("compile", hbs(handlebarOptions));

  // ✍️ Plain text fallback (spam protection)
  const plainText = `
  ${labelProps.verify_instruction}

  ${productDetails
    .map(detail =>
      Array.isArray(detail.value)
        ? `${detail.label}: [${detail.value.length} images]`
        : `${detail.label}: ${detail.value}`
    )
    .join("\n")}

  ${creatorMessage || ""}
  Verify here: ${link}
  `;

  const mailOptions = {
    from: sent_from,
    to: send_to,
    replyTo: reply_to,
    subject: subject,
    template: template,
    context: {
      link,
      ...labelProps,
      creatorMessage,
      productDetails,
      name,
    },
    text: plainText,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Email send error:", err);
        reject(err);
      } else {
        console.log("Email sent:", info.messageId);
        resolve(info);
      }
    });
  });
};

module.exports = sendProductEmail;
