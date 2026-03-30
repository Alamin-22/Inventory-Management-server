type TReviewNotification = {
  productName: string;
  reviewerName: string;
  rating: number;
  reviewTitle: string;
  reviewComment: string;
  reviewId: string;
  companyName: string;
  adminReviewDashboardUrl: string;
  companyLogo: string;
  themeColor?: string;
};

const generateStarRating = (rating: number): string => {
  const totalStars = 5;
  // Ensure rating is within 0-5
  const safeRating = Math.max(0, Math.min(5, Math.round(rating)));
  const filledStars = '★'.repeat(safeRating);
  const emptyStars = '☆'.repeat(totalStars - safeRating);
  return `<span style="color: #fbbf24; font-size: 18px;">${filledStars}</span><span style="color: #d1d5db; font-size: 18px;">${emptyStars}</span>`;
};

const ReviewNotificationTemplate = ({
  productName,
  reviewerName,
  rating,
  reviewTitle,
  reviewComment,
  reviewId,
  companyName,
  adminReviewDashboardUrl,
  companyLogo,
  themeColor,
}: TReviewNotification) => {
  // Construct the direct link for an admin to approve the review
  const approvalLink = `${adminReviewDashboardUrl.replace(/\/$/, '')}/reviews/manage/${reviewId}`;

  const brandColor = themeColor || '#2563eb';

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>New Product Review Submitted</title>
  </head>
  <body style="margin:0; padding:0; background:#f2f2f2; font-family: Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding: 20px 0;">
      <tr><td align="center">
        <table width="600" style="background:#ffffff; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.1); overflow:hidden;">
          
          <tr>
            <td style="padding:20px; border-bottom:1px solid #e0e0e0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:Arial,sans-serif; font-size:20px; color:#333;">
                    <strong>New Product Review</strong>
                  </td>
                  <td align="right">
                    <img src="${companyLogo}" alt="${companyName}" style="max-width:120px; height:auto; display:block;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:30px 20px;">
              <p style="font-family:Arial,sans-serif; font-size:16px; color:#555; line-height:1.5; margin-top:0;">
                A new review has been submitted for <strong>${companyName}</strong> and is awaiting your approval.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-top:20px; border:1px solid #e5e7eb;">
                ${[
                  { label: 'Product', value: `<strong style="color:#111827;">${productName}</strong>` },
                  { label: 'Reviewer', value: reviewerName },
                  { label: 'Rating', value: generateStarRating(rating) },
                  { label: 'Title', value: reviewTitle },
                ]
                  .map(
                    (row, index) => `
                <tr style="background-color: ${index % 2 === 0 ? '#f9fafb' : '#ffffff'};">
                  <td style="padding:12px 15px; border-bottom:1px solid #e5e7eb; font-family:Arial,sans-serif; font-size:14px; color:#6b7280; width: 30%; vertical-align:top;">
                    ${row.label}
                  </td>
                  <td style="padding:12px 15px; border-bottom:1px solid #e5e7eb; font-family:Arial,sans-serif; font-size:14px; color:#374151; vertical-align:top;">
                    ${row.value}
                  </td>
                </tr>`,
                  )
                  .join('')}
              </table>

              <div style="margin-top:25px;">
                <strong style="font-family:Arial,sans-serif; font-size:14px; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px;">Review Comment</strong>
                <div style="margin-top:8px; padding:15px; border-radius:6px; background:#f3f4f6; border-left: 4px solid ${brandColor};">
                  <p style="font-family:Arial,sans-serif; font-size:15px; color:#333; line-height:1.6; margin:0; font-style:italic;">
                    "${reviewComment}"
                  </p>
                </div>
              </div>

               <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                <tr>
                  <td align="center">
                    <a href="${approvalLink}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-family: Arial, sans-serif; color: #ffffff; background-color: ${brandColor}; border-radius: 6px; text-decoration: none; font-weight: bold;">
                      Review and Publish
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:20px; text-align:center; background:#f9fafb; border-top:1px solid #e0e0e0;">
              <p style="font-family:Arial,sans-serif; font-size:12px; color:#9ca3af; margin:0;">
                &copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
};

export default ReviewNotificationTemplate;
