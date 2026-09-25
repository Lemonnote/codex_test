def add(a, b):
    return a + b


if __name__ == "__main__":
    # 正常正數
    assert add(2, 3) == 5, "正數相加錯誤"
    assert add(10, 20) == 30, "正數相加錯誤"

    # 含零
    assert add(0, 5) == 5, "含零相加錯誤"
    assert add(0, 0) == 0, "0 + 0 錯誤"

    # 負數
    assert add(-2, -3) == -5, "負數相加錯誤"
    assert add(-2, 3) == 1, "正負數相加錯誤"

    # 小數
    assert add(1.5, 2.5) == 4.0, "小數相加錯誤"
    assert add(-1.1, 2.2) == 1.1, "正負小數相加錯誤"

    print("所有 add() 測試案例均通過")
