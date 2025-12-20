# ⚔️ Combat System

> **How fighting works in Orbit Fall.** Damage, shields, health, and all that.

---

## 🎯 Starting Combat

> **Double-click an enemy** to target it and start combat. Your lasers will auto-fire at the target.

You can also fire rockets manually with spacebar, but that doesn't start auto-combat.

---

## 💥 Damage Types

You have two damage sources:

| Type | Description | Fire Rate |
|:-----|:------------|:----------|
| 🔫 **Lasers** | Continuous damage, auto-fires in combat | 1 shot/second |
| 💣 **Rockets** | Burst damage, manual fire, long cooldown | 1 shot/3 seconds |

---

## 🔫 Laser Damage Formula

```
Total Laser Damage = (Cannon Base Damage) × (Ammo Multiplier)
```

### 📊 Examples

| Setup | Calculation | Result |
|:------|:------------|:-------|
| PL-1 + LC-10 | 65 × 1 | **65 damage** |
| PL-1 + LC-25 | 65 × 2 | **130 damage** |
| PL-3 + RS-75 | 175 × 6 | **1,050 damage** |

> ⚡ **Lasers fire once per second** when in combat. So if you do 65 damage per shot, that's **65 DPS** (damage per second).

---

## 💣 Rocket Damage

Rockets do flat damage. No multipliers, just the rocket's base damage.

| Rocket | Damage |
|:-------|:-------|
| RT-01 | 1,000 |
| RT-02 | 2,000 |
| RT-03 | 4,000 |
| RT-04 | 6,000 |

> ⏱️ **Rockets have a 3-second cooldown.** You can't spam them.

---

## 🛡️ Shield System

Shields absorb damage before your HP takes it.

### 🔄 How It Works

1. 💥 Damage hits your shield first
2. 🛡️ Shield absorbs what it can
3. ❤️ Remaining damage goes to HP
4. ⚠️ When shield is gone, all damage goes to HP

### 📊 Examples

#### Example 1: High Shield

```
You have: 600 shield + 1,000 HP
You take: 800 damage

Result:
- Shield absorbs 600 damage (shield is now 0)
- HP takes 200 damage (HP is now 800)
```

#### Example 2: Low Shield

```
You have: 100 shield + 1,000 HP
You take: 500 damage

Result:
- Shield absorbs 100 damage (shield is now 0)
- HP takes 400 damage (HP is now 600)
```

> ⏳ **Shields regenerate over time** (coming soon). Right now, once they're gone, they're gone until you get new equipment.

---

## 👾 Enemy Health

Enemies have both shield and HP:

### 👾 Drifter

| Stat | Value |
|:-----|:------|
| 🛡️ Shield | 600 |
| ❤️ HP | 1,000 |
| 💪 **Total** | **1,600** |

> 💡 **You need to break through the shield first, then kill the HP.**

---

## ⏱️ Attack Cooldowns

| Weapon | Cooldown | Notes |
|:-------|:---------|:------|
| 🔫 **Lasers** | 1 second | Between shots (when in combat) |
| 💣 **Rockets** | 3 seconds | Between shots (manual fire) |

> 💡 **Cooldowns are per weapon type.** You can fire lasers and rockets at the same time (if rockets are off cooldown).

---

## 📏 Attack Range

| Entity | Range | Notes |
|:-------|:------|:------|
| 🚀 **You** | 40 units | Your attack range |
| 👾 **Drifters** | 30 units | Shorter than yours |

> 💡 **You can outrange some enemies.** Stay at max range and they can't hit you back.

---

## 🔄 Combat Flow

1. 🎯 **Target enemy**: Double-click to start combat
2. 🔫 **Lasers auto-fire**: They fire once per second at your target
3. 💣 **Fire rockets**: Press spacebar for burst damage
4. ⚔️ **Enemy fights back**: They attack you if in range
5. 💀 **Kill or die**: One of you dies, or you run away

---

## 🧮 Damage Calculation Example

Let's say you're fighting a Drifter with:

| Equipment | Value |
|:----------|:------|
| 🔫 PL-1 cannon | 65 base damage |
| 🔋 LC-10 ammo | 1x multiplier |
| 💣 RT-01 rockets | 1,000 damage |

### 💥 Your Damage

| Weapon | Damage | Rate |
|:-------|:-------|:-----|
| 🔫 Laser | 65 per second | Continuous |
| 💣 Rocket | 1,000 every 3 seconds | Burst |

### 👾 Drifter Health

```
600 (shield) + 1,000 (HP) = 1,600 total
```

### ⏱️ Time to Kill

| Method | Calculation | Result |
|:-------|:------------|:-------|
| 🔫 Lasers only | 1,600 ÷ 65 | **~25 seconds** |
| 🔫💣 Lasers + 1 rocket | (1,600 - 1,000) ÷ 65 | **~9 seconds** |
| 💣💣 2 rockets | Instant (if rockets hit first) | **~6 seconds** |

> 💡 **Rockets speed things up a lot.**

---

## 💡 Combat Tips

### ✅ Best Practices

1. 💣 **Start with rockets**: Fire a rocket first, then let lasers finish the job

2. 📏 **Stay at range**: Keep enemies at max range so they can't hit you easily

3. ❤️ **Watch your health**: You have 4,000 HP. Drifters do 20 per shot. You can take hits, but don't get reckless

4. 🏃 **Use distance as cover**: There's no cover in space, but you can use distance as cover

5. 🎯 **Kite enemies**: Move away while shooting. They chase, you shoot. Classic tactic

6. 💰 **Save rockets**: Rockets are expensive. Use them on tough enemies or when you need quick kills

---

## 💀 Death and Respawn

When you die (HP hits 0):

- 🔄 You respawn (coming soon)
- 💰 You might lose some credits or experience (TBD)
- 🛡️ There's an invulnerability period after respawn (coming soon)

> ⚠️ **Right now, death mechanics are still being built.** Don't die if you can help it.

---

## 🔮 Future Combat Features

> **More features coming:**

- 🛡️ **Shield regeneration**: Shields will regen over time
- ❤️ **Health regeneration**: HP will regen slowly or via items
- ✨ **Special abilities**: Speed boost, shield boost, EMP, etc.
- 💥 **Area damage**: Weapons that hit multiple enemies
- 🎯 **Status effects**: Damage over time, slows, etc.

> 💡 **Combat is simple now, but it'll get more complex as the game develops.**

---

## 📊 Combat Summary

| Aspect | Value |
|:-------|:------|
| 🎯 **Target Method** | Double-click enemy |
| 🔫 **Laser Fire** | Auto (1/sec in combat) |
| 💣 **Rocket Fire** | Manual (spacebar) |
| 📏 **Your Range** | 40 units |
| ⏱️ **Laser Cooldown** | 1 second |
| ⏱️ **Rocket Cooldown** | 3 seconds |
| 🛡️ **Shield System** | Absorbs damage first |
| ❤️ **Your HP** | 4,000 (Sparrow) |
