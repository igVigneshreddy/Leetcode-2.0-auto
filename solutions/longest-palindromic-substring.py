class Solution:
    def longestPalindrome(self, s: str) -> str:
        n = len(s)
        if n < 2:
            return s

        start = 0
        max_len = 1

        def expand_around_center(left, right):
            nonlocal start, max_len
            while left >= 0 and right < n and s[left] == s[right]:
                left -= 1
                right += 1
            
            # The loop exits when s[left] != s[right] or boundaries are hit.
            # So the palindrome is s[left+1 ... right-1]
            current_len = right - 1 - (left + 1) + 1
            if current_len > max_len:
                max_len = current_len
class Solution: