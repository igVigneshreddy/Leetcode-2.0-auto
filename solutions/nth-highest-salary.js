// LeetCode Problem: Nth Highest Salary
// Difficulty: Medium
// Language: JavaScript
// URL: https://leetcode.com/problems/nth-highest-salary/

CREATE FUNCTION getNthHighestSalary(N INT) RETURNS INT
BEGIN
  DECLARE offsetVal INT;
  SET offsetVal = N - 1;
  RETURN (
      SELECT DISTINCT Salary
      FROM Employee
      ORDER BY Salary DESC
      LIMIT 1 OFFSET offsetVal
  );
END
CREATE FUNCTION getNthHighestSalary(N INT) RETURNS INT
