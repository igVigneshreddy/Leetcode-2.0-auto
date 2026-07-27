class Solution:
    def myAtoi(self, s: str) -> int:
        
        i = 0
        n = len(s)
        
        while i < n and s[i] == ' ':
            i += 1
            
        sign = 1
        if i < n and (s[i] == '-' or s[i] == '+'):
            if s[i] == '-':
                sign = -1
            i += 1
            
        
        result = 0
        
        
        INT_MAX = 2**31 - 1
class Solution: