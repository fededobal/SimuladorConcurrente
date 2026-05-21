(* ========================================================================== *)
(* GRAMÁTICA EBNF - SIMULADOR DE PROGRAMACIÓN CONCURRENTE (UNLP)              *)
(* ========================================================================== *)

program            = { declaration | process_decl | statement } ;

(* --- 1. DECLARACIONES Y TIPOS --- *)
declaration        = type_decl , identifier_list , ";" ;
type_decl          = "int" | "bool" | "sem" ;

identifier_list    = init_decl , { "," , init_decl } ;
init_decl          = identifier , [ array_def ] , [ "=" , ( expression | array_init ) ] ;

array_def          = "[" , range_spec , { "," , range_spec } , "]" ;
range_spec         = expression , [ ":" , expression ] ;
array_init         = "(" , "[" , expression , "]" , ( expression | array_init ) , ")" ;

(* --- 2. PROCESOS --- *)
process_decl       = "process" , identifier , [ quant_def ] , block ;

(* --- 3. SENTENCIAS (STATEMENTS) --- *)
statement          = assignment_stmt 
                   | swap_stmt 
                   | skip_stmt
                   | if_stmt 
                   | do_stmt 
                   | while_stmt       (* NUEVO *)
                   | for_stmt         (* NUEVO *)
                   | fa_stmt 
                   | co_stmt 
                   | atomic_stmt 
                   | await_stmt 
                   | sem_op_stmt
                   | func_call_stmt
                   | inc_dec_stmt     (* NUEVO *)
                   | block ;

block              = "{" , { statement } , "}" ;

(* Separamos la asignación base de la sentencia para reutilizarla en el FOR *)
assignment         = identifier , [ array_access ] , "=" , expression ;
assignment_stmt    = assignment , ";" ;

swap_stmt          = identifier , [ array_access ] , ":=:" , identifier , [ array_access ] , ";" ;
skip_stmt          = "skip" , ";" ;
func_call_stmt     = identifier , "(" , [ argument_list ] , ")" , ";" ;

inc_dec            = identifier , [ array_access ] , ( "++" | "--" ) ;
inc_dec_stmt       = inc_dec , ";" ;

(* --- 4. CONTROL DE FLUJO (DIJKSTRA Y CLÁSICO) --- *)
if_stmt            = "if" , guarded_commands , "fi" 
                   | "if" , "(" , expression , ")" , statement , [ "else" , statement ] ;

do_stmt            = "do" , guarded_commands , "od" ;

guarded_commands   = guard , "->" , statement , { "[]" , guard , "->" , statement } ;
guard              = expression ;

(* Bucle While Clásico *)
while_stmt         = "while" , "(" , expression , ")" , statement ;

(* Bucle For (Soporta estilo C y estilo Cuantificado de la cátedra) *)
for_stmt           = "for" , ( for_c_style | for_quant_style ) , statement ;
for_c_style        = "(" , [ assignment ] , ";" , [ expression ] , ";" , [ step_action ] , ")" ;
step_action        = assignment | inc_dec ;
for_quant_style    = "(" , identifier , "=" , expression , "to" , expression , ")" ;

(* Bucle For-All (Estructurado) *)
fa_stmt            = "fa" , quant_list , [ "st" , expression ] , "->" , statement , "af" ;
quant_list         = quant_assign , { "," , quant_assign } ;
quant_assign       = identifier , ":=" , expression , "to" , expression ;

(* --- 5. CONCURRENCIA Y SINCRONIZACIÓN --- *)
co_stmt            = "co" , ( stmt_list | quant_co ) , "oc" ;
stmt_list          = statement , { "//" , statement } ;
quant_co           = quant_def , statement ;
quant_def          = "[" , identifier , "=" , expression , "to" , expression , "]" ;

atomic_stmt        = "<" , { statement } , ">" ;
await_stmt         = "<" , "await" , "(" , expression , ")" , [ { statement } ] , ">" ;

sem_op_stmt        = ( "P" | "V" ) , "(" , identifier , [ array_access ] , ")" , ";" ;

(* --- 6. EXPRESIONES --- *)
expression         = term , { binary_operator , term } ;
term               = identifier , [ array_access ] 
                   | literal 
                   | "(" , expression , ")" 
                   | unary_operator , term
                   | func_call_expr ;

array_access       = "[" , expression , { "," , expression } , "]" ;
argument_list      = expression , { "," , expression } ;
func_call_expr     = identifier , "(" , [ argument_list ] , ")" ;

(* --- 7. OPERADORES Y LITERALES (TOKENS LÉXICOS) --- *)
binary_operator    = "+" | "-" | "*" | "/" 
                   | "==" | "<>" | "!=" | ">" | "<" | ">=" | "<=" 
                   | "and" | "or" | "XOR" | "<<" | ">>" ;
unary_operator     = "not" | "-" | "!" ;

literal            = number | boolean | "∅" ;
boolean            = "true" | "false" ;

(* Reglas léxicas base *)
number             = digit , { digit } ;
identifier         = letter , { letter | digit | "_" } ;
digit              = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" ;
letter             = "a" ... "z" | "A" ... "Z" ;