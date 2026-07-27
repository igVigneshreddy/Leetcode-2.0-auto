class Solution:
    def reverse(self, x: int) -> int:
        
        sign = 1 if x >= 0 else -1
        x = abs(x)
        
        reversed_x = 0
        
        INT_MAX = 2**31 - 1
        INT_MIN = -2**31
        
        while x > 0:
            digit = x % 10
            
            
            if reversed_x > INT_MAX // 10 or (reversed_x == INT_MAX // 10 and digit > 7):
                return 0
            if reversed_x < INT_MIN // 10 or (reversed_x == INT_MIN // 10 and digit < -8): 
                return 0
            
class Solution: