class Solution(object):
    def generateParenthesis(self, n):
        """
        :type n: int
        :rtype: List[str]
        """
        ans = []

        def backtrack(current_string, open_count, close_count):
            if len(current_string) == 2 * n:
                ans.append("".join(current_string))
                return

            if open_count < n:
                current_string.append("(")
                backtrack(current_string, open_count + 1, close_count)
                current_string.pop()

            if close_count < open_count:
                current_string.append(")")
class Solution(object):