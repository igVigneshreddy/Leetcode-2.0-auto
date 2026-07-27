// LeetCode Problem: Product Sales Analysis III
// Difficulty: Medium
// Language: JavaScript
// URL: https://leetcode.com/problems/product-sales-analysis-iii/

SELECT
    s.product_id,
    s.year AS first_year,
    s.quantity,
    s.price
FROM
    Sales s
INNER JOIN (
    SELECT
        product_id,
        MIN(year) AS min_year
    FROM
        Sales
    GROUP BY
        product_id
) AS min_years
ON
    s.product_id = min_years.product_id AND s.year = min_years.min_year;
SELECT
